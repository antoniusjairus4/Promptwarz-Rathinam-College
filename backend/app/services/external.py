"""Bounded, cached backend HTTP. No provider is required by the AI workflow."""
from contextlib import asynccontextmanager
import asyncio
import base64
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import time
from urllib.parse import quote, urlsplit, urlunsplit

import httpx

from app.core.config import Settings
from app.models.integrations import (
    Attribution, JobListing, JobsResponse, LearningResource, ProviderStatus,
    RepositoryMetadata, RepositoryResponse, SourceFile,
)
from app.models.workflow import now


class ProviderFailure(Exception):
    def __init__(self, detail: str, rate_limited=False, retry_after=None):
        self.detail, self.rate_limited, self.retry_after = detail, rate_limited, retry_after


def web_url(value) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = urlsplit(value)
        if parsed.scheme in {"http", "https"} and parsed.hostname and not parsed.username and not parsed.password:
            return value
    except ValueError:
        pass
    return None


def plain(value, limit=500):
    return html.unescape(re.sub(r"<[^>]*>", " ", str(value or ""))).strip()[:limit]


def date(value):
    if value is None:
        return None
    try:
        stamp = datetime.fromtimestamp(value, timezone.utc) if isinstance(value, (int, float)) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return stamp.replace(tzinfo=stamp.tzinfo or timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError, OSError):
        return None


def unexpired(job):
    return not job.expires_at or datetime.fromisoformat(job.expires_at) > datetime.now(timezone.utc)


class ExternalServices:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.settings = settings
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(settings.external_timeout_seconds), follow_redirects=False, headers={"User-Agent": "Maximus/0.3 (+https://github.com/antoniusjairus4/Promptwarz-Rathinam-College)", "Accept": "application/json"}, limits=httpx.Limits(max_connections=8))
        self.cache = {}
        self.locks = {name: asyncio.Lock() for name in ["himalayas", "remotive", "github", "youtube", "arbeitnow", "adzuna"]}
        self.github_slots = asyncio.Semaphore(3)
        self.github_keys = {}
        self.cooldowns = {}
        self.next_request = {}
        self._load_remotive()

    def _load_remotive(self):
        try:
            path = Path(self.settings.external_cache_dir) / "remotive.json"
            if path.stat().st_size > 8_000_000:
                return
            saved = json.loads(path.read_text())
            if saved["expires"] > time.time() and saved["expires"] <= time.time() + 21600 and isinstance(saved["data"].get("jobs"), list):
                self.cache[("remotive", "feed")] = (saved["expires"], saved["data"], saved["fetched_at"])
        except (OSError, ValueError, TypeError, KeyError, AttributeError):
            pass

    async def close(self):
        await self.client.aclose()

    async def _json(self, url, *, params=None, headers=None, max_bytes=4_000_000):
        try:
            # Total elapsed deadline supplements HTTPX's per-operation timeouts.
            budget = min(20, self.settings.external_timeout_seconds * 2) if urlsplit(url).hostname == "api.github.com" else self.settings.external_timeout_seconds
            async with asyncio.timeout(budget):
                async with self.client.stream("GET", url, params=params, headers=headers, timeout=budget) as response:
                    if response.status_code in {403, 429} and (response.status_code == 429 or response.headers.get("x-ratelimit-remaining") == "0"):
                        delay = response.headers.get("retry-after", "60")
                        try:
                            delay = max(60, int(response.headers["x-ratelimit-reset"]) - int(time.time())) if "x-ratelimit-reset" in response.headers else max(60, int(delay))
                        except ValueError:
                            delay = 60
                        raise ProviderFailure("Provider rate limit reached", True, min(delay, 86400))
                    if not response.is_success:
                        raise ProviderFailure(f"Provider HTTP {response.status_code}")
                    data = bytearray()
                    async for chunk in response.aiter_bytes():
                        data.extend(chunk)
                        if len(data) > max_bytes:
                            raise ProviderFailure("Provider response exceeded size limit")
            result = json.loads(data)
            if isinstance(result, list):
                result = {"items": result}
            if not isinstance(result, dict):
                raise ProviderFailure("Invalid provider response")
            return result
        except (httpx.HTTPError, TimeoutError) as exc:
            raise ProviderFailure(f"Provider network failure ({type(exc).__name__})") from None
        except (ValueError, UnicodeError):
            raise ProviderFailure("Invalid provider JSON") from None

    @asynccontextmanager
    async def _fetch_lock(self, provider, key):
        if provider != "github":
            async with self.locks[provider]:
                yield
            return
        # Same-key callers share the cache; distinct GETs use at most three sockets.
        async with self.github_slots:
            lock = self.github_keys.setdefault(key, asyncio.Lock())
            async with lock:
                yield
            if len(self.github_keys) > 256:
                for old_key, old_lock in list(self.github_keys.items()):
                    if old_key != key and not old_lock.locked():
                        del self.github_keys[old_key]
                        break

    async def fetch(self, provider, key, url, *, params=None, headers=None, ttl=900, max_bytes=4_000_000):
        enabled = getattr(self.settings, f"{provider}_enabled")
        if not enabled:
            return None, ProviderStatus(provider=provider, status="disabled")
        async with self._fetch_lock(provider, key):
            cached = self.cache.get((provider, key))
            if cached and cached[0] > time.time():
                return deepcopy(cached[1]), ProviderStatus(provider=provider, status="ok", cached=True, fetched_at=cached[2])
            cooldown = self.cooldowns.get(provider) or self.cooldowns.get((provider, key))
            if cooldown and cooldown[0] > time.time():
                status = cooldown[1].model_copy(deep=True)
                status.retry_after_seconds = max(1, int(cooldown[0] - time.time()))
                return None, status
            # Space cold requests per provider; cached reads never consume network quota.
            async def pace():
                remaining = self.next_request.get(provider, 0) - time.monotonic()
                if remaining > 0:
                    await asyncio.sleep(remaining)
                self.next_request[provider] = time.monotonic() + (2 if provider == "himalayas" else 1)
            if provider == "github":
                async with self.locks[provider]:
                    await pace()
                # A different concurrent call may have discovered a global rate limit.
                cooldown = self.cooldowns.get(provider)
                if cooldown and cooldown[0] > time.time():
                    return None, cooldown[1].model_copy(deep=True)
            else:
                await pace()
            try:
                data = await self._json(url, params=params, headers=headers, max_bytes=max_bytes)
                stamp = now()
                # Bound process-local cache cardinality without evicting the rate-sensitive feed.
                if len(self.cache) >= 256:
                    for cache_key in list(self.cache):
                        if cache_key != ("remotive", "feed"):
                            del self.cache[cache_key]
                            break
                self.cache[(provider, key)] = (time.time() + ttl, deepcopy(data), stamp)
                if provider == "remotive":
                    try:
                        path = Path(self.settings.external_cache_dir) / "remotive.json"
                        path.parent.mkdir(parents=True, exist_ok=True)
                        temporary = path.with_suffix(".tmp")
                        temporary.write_text(json.dumps({"expires": time.time() + ttl, "data": data, "fetched_at": stamp}))
                        temporary.replace(path)
                    except OSError:
                        # Do not exceed daily fetch guidance if cache cannot persist across restarts.
                        self.cache[(provider, key)] = (time.time() + ttl, deepcopy(data), stamp)
                return data, ProviderStatus(provider=provider, status="ok", fetched_at=stamp)
            except ProviderFailure as exc:
                status = ProviderStatus(provider=provider, status="rate_limited" if exc.rate_limited else "error", detail=exc.detail, retry_after_seconds=exc.retry_after or 60)
                cooldown_key = provider if exc.rate_limited else (provider, key)
                self.cooldowns[cooldown_key] = (time.time() + (exc.retry_after or 60), status)
                return None, status

    def normalize(self, source, row):
        if source == "himalayas":
            apply = web_url(row.get("applicationLink"))
            source_url = web_url(row.get("guid")) or "https://himalayas.app"
            title, company = row.get("title"), row.get("companyName")
            locations = row.get("locationRestrictions") or []
            location = ", ".join(str(x) for x in locations) if locations else "Worldwide"
            published, expires = date(row.get("pubDate")), date(row.get("expiryDate"))
            tags, employment = row.get("categories") or [], row.get("employmentType")
        elif source == "arbeitnow":
            apply = source_url = web_url(row.get("url"))
            title, company = row.get("title"), row.get("company_name")
            location = row.get("location")
            published, expires = date(row.get("created_at")), None
            tags, employment = row.get("tags") or [], ", ".join(row.get("job_types") or []) or None
        elif source == "adzuna":
            apply = web_url(row.get("redirect_url"))
            source_url = apply or "https://www.adzuna.com"
            title, company = row.get("title"), (row.get("company") or {}).get("display_name")
            location = (row.get("location") or {}).get("display_name")
            published, expires = date(row.get("created")), None
            tags, employment = [(row.get("category") or {}).get("label", "")], row.get("contract_type")
        else:
            apply = source_url = web_url(row.get("url"))
            title, company = row.get("title"), row.get("company_name")
            location = row.get("candidate_required_location")
            published, expires = date(row.get("publication_date")), None
            tags, employment = row.get("tags") or [], row.get("job_type")
        if not apply or not title or not company:
            return None
        identifier = str(row.get("id") or row.get("guid") or apply)
        return JobListing(id=source + ":" + hashlib.sha256(identifier.encode()).hexdigest()[:20], title=plain(title, 250), company=plain(company, 250), location=plain(location, 1000) or None, employment_type=plain(employment, 100) or None, summary=plain(row.get("excerpt") or row.get("description")), tags=[plain(x, 100) for x in tags[:30]], published_at=published, expires_at=expires, application_url=apply, sources=[Attribution(source=source, source_url=source_url, application_url=apply)])

    async def jobs(self, query, provider, limit):
        async def one(name):
            if name == "himalayas":
                data, status = await self.fetch(name, query.casefold(), "https://himalayas.app/jobs/api/search", params={"q": query, "page": 1})
            elif name == "arbeitnow":
                data, status = await self.fetch(name, "feed", "https://www.arbeitnow.com/api/job-board-api", ttl=21600, max_bytes=8_000_000)
                if data is not None:
                    data = {"jobs": data.get("data")}
            elif name == "adzuna":
                if not self.settings.adzuna_app_id or not self.settings.adzuna_app_key.get_secret_value():
                    return [], ProviderStatus(provider="adzuna", status="not_configured")
                data, status = await self.fetch(name, query.casefold(), "https://api.adzuna.com/v1/api/jobs/" + self.settings.adzuna_country + "/search/1", params={"app_id": self.settings.adzuna_app_id, "app_key": self.settings.adzuna_app_key.get_secret_value(), "what": query, "results_per_page": 20, "content-type": "application/json"}, ttl=3600)
                if data is not None:
                    data = {"jobs": data.get("results")}
            else:
                # One six-hour feed for all searches, not one upstream request per query.
                data, status = await self.fetch(name, "feed", "https://remotive.com/api/remote-jobs", params={"limit": 200}, ttl=21600, max_bytes=8_000_000)
            output = []
            if data is not None:
                if not isinstance(data.get("jobs"), list):
                    status.status, status.detail = "error", "Invalid jobs response"
                else:
                    for row in data["jobs"][:200]:
                        if not isinstance(row, dict):
                            continue
                        try:
                            job = self.normalize(name, row)
                            searchable = " ".join(str(row.get(k) or "") for k in ["title", "company_name", "companyName", "description", "category", "tags"]).casefold()
                            if job and unexpired(job) and (name not in {"remotive", "arbeitnow"} or all(word in searchable for word in query.casefold().split())):
                                output.append(job)
                        except (ValueError, TypeError, AttributeError):
                            continue
            return output, status
        names = ["himalayas", "remotive", "arbeitnow", "adzuna"] if provider == "all" else ["himalayas", "remotive"] if provider == "both" else [provider]
        results = await asyncio.gather(*(one(name) for name in names), return_exceptions=True)
        jobs, statuses, seen = [], [], {}
        for name, result in zip(names, results):
            if isinstance(result, BaseException):
                statuses.append(ProviderStatus(provider=name, status="error", detail="Provider processing failure"))
                continue
            listings, status = result
            statuses.append(status)
            for job in listings:
                # Comparison only: never rewrite the application URL returned to clients.
                url = urlsplit(job.application_url)
                canonical = urlunsplit((url.scheme, url.netloc.casefold(), url.path.rstrip("/"), "", ""))
                signature = tuple(re.sub(r"\W+", " ", value.casefold()).strip() for value in [job.company, job.title, job.location or ""])
                duplicate = seen.get(canonical)
                cross_source = seen.get(signature)
                if duplicate is None and cross_source and not any(s.source == name for s in cross_source.sources):
                    duplicate = cross_source
                if duplicate:
                    for source in job.sources:
                        if source not in duplicate.sources:
                            duplicate.sources.append(source)
                else:
                    seen[canonical] = seen[signature] = job
                    jobs.append(job)
        return JobsResponse(jobs=jobs[:limit], providers=statuses, returned_count=len(jobs[:limit]))

    async def youtube(self, query):
        if not self.settings.youtube_enabled:
            return [], ProviderStatus(provider="youtube", status="disabled")
        if not self.settings.youtube_api_key.get_secret_value():
            return [], ProviderStatus(provider="youtube", status="not_configured")
        data, status = await self.fetch("youtube", query.casefold(), "https://www.googleapis.com/youtube/v3/search", params={"part": "snippet", "type": "video", "q": query + " tutorial", "maxResults": 5, "safeSearch": "strict", "key": self.settings.youtube_api_key.get_secret_value()}, ttl=3600)
        resources = []
        for item in (data or {}).get("items", [])[:5]:
            try:
                video_id, snippet = item["id"]["videoId"], item["snippet"]
                if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
                    continue
                resources.append(LearningResource(id="youtube:" + video_id, title=plain(snippet["title"], 250), provider="YouTube", url="https://www.youtube.com/watch?v=" + video_id, kind="video", topics=[query], provenance="youtube_api", channel=plain(snippet["channelTitle"], 250)))
            except (KeyError, TypeError, ValueError):
                continue
        return resources, status

    def github_headers(self):
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        if self.settings.github_token.get_secret_value():
            headers["Authorization"] = "Bearer " + self.settings.github_token.get_secret_value()
        return headers

    async def github(self, owner, repo, paths):
        base = "https://api.github.com/repos/" + quote(owner, safe="") + "/" + quote(repo, safe="")
        headers = self.github_headers()
        data, status = await self.fetch("github", (owner.casefold(), repo.casefold()), base, headers=headers, ttl=1800)
        if data is None:
            return RepositoryResponse(repository=None, files=[], providers=[status])
        if data.get("private") is not False or not data.get("full_name"):
            return RepositoryResponse(repository=None, files=[], providers=[ProviderStatus(provider="github", status="error", detail="Only public repositories are supported")])
        try:
            metadata = RepositoryMetadata(full_name=data["full_name"], url=web_url(data["html_url"]), description=data.get("description"), language=data.get("language"), stars=data.get("stargazers_count", 0), forks=data.get("forks_count", 0), default_branch=data["default_branch"], pushed_at=data.get("pushed_at"), license=(data.get("license") or {}).get("spdx_id"))
        except (KeyError, ValueError, TypeError):
            return RepositoryResponse(repository=None, files=[], providers=[ProviderStatus(provider="github", status="error", detail="Invalid repository metadata")])
        async def read_file(path):
            content, file_status = await self.fetch("github", (owner.casefold(), repo.casefold(), path, metadata.default_branch), base + "/contents/" + quote(path, safe="/"), params={"ref": metadata.default_branch}, headers=headers, ttl=1800, max_bytes=200_000)
            if content is None:
                return SourceFile(path=path, status="error", detail=file_status.detail or file_status.status), file_status
            if content.get("type") != "file" or content.get("encoding") != "base64":
                return SourceFile(path=path, status="unsupported"), file_status
            try:
                if int(content.get("size", 65537)) > 65536:
                    return SourceFile(path=path, status="too_large"), file_status
                decoded = base64.b64decode(content["content"], validate=False)
                if len(decoded) > 65536:
                    return SourceFile(path=path, status="too_large"), file_status
                text = decoded.decode("utf-8")
                if "\x00" in text:
                    raise ValueError()
                return SourceFile(path=path, status="ok", content=text, sha=content["sha"], url=web_url(content.get("html_url"))), file_status
            except (KeyError, ValueError, TypeError, UnicodeError):
                return SourceFile(path=path, status="unsupported", detail="Only bounded UTF-8 source files are supported"), file_status
        results = await asyncio.gather(*(read_file(path) for path in paths[:6]))
        files = [file for file, _ in results]
        statuses = [status, *[state for _, state in results]]
        return RepositoryResponse(repository=metadata, files=files, providers=statuses)
