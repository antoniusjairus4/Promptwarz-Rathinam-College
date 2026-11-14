"""Bounded, cached backend HTTP. No provider is required by the AI workflow."""
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
        self.locks = {name: asyncio.Lock() for name in ["himalayas", "remotive", "github", "youtube"]}
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
            async with asyncio.timeout(self.settings.external_timeout_seconds):
                async with self.client.stream("GET", url, params=params, headers=headers) as response:
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
            if not isinstance(result, dict):
                raise ProviderFailure("Invalid provider response")
            return result
        except (httpx.HTTPError, TimeoutError) as exc:
            raise ProviderFailure(f"Provider network failure ({type(exc).__name__})") from None
        except (ValueError, UnicodeError):
            raise ProviderFailure("Invalid provider JSON") from None

    async def fetch(self, provider, key, url, *, params=None, headers=None, ttl=900, max_bytes=4_000_000):
        enabled = getattr(self.settings, f"{provider}_enabled")
        if not enabled:
            return None, ProviderStatus(provider=provider, status="disabled")
        async with self.locks[provider]:
            cached = self.cache.get((provider, key))
            if cached and cached[0] > time.time():
                return deepcopy(cached[1]), ProviderStatus(provider=provider, status="ok", cached=True, fetched_at=cached[2])
            cooldown = self.cooldowns.get(provider)
            if cooldown and cooldown[0] > time.time():
                status = cooldown[1].model_copy(deep=True)
                status.retry_after_seconds = max(1, int(cooldown[0] - time.time()))
                return None, status
            # Space cold requests per provider; cached reads never consume network quota.
            remaining = self.next_request.get(provider, 0) - time.monotonic()
            if remaining > 0:
                await asyncio.sleep(remaining)
            self.next_request[provider] = time.monotonic() + (2 if provider == "himalayas" else 1)
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
                self.cooldowns[provider] = (time.time() + (exc.retry_after or 60), status)
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
                            if job and unexpired(job) and (name != "remotive" or all(word in searchable for word in query.casefold().split())):
                                output.append(job)
                        except (ValueError, TypeError, AttributeError):
                            continue
            return output, status
        names = ["himalayas", "remotive"] if provider == "both" else [provider]
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

    async def github(self, owner, repo, paths):
        base = "https://api.github.com/repos/" + quote(owner, safe="") + "/" + quote(repo, safe="")
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        # Public/no-key by design, even if an unrelated token is configured locally.
        data, status = await self.fetch("github", (owner.casefold(), repo.casefold()), base, headers=headers, ttl=1800)
        if data is None:
            return RepositoryResponse(repository=None, files=[], providers=[status])
        if data.get("private") is not False or not data.get("full_name"):
            return RepositoryResponse(repository=None, files=[], providers=[ProviderStatus(provider="github", status="error", detail="Only public repositories are supported")])
        try:
            metadata = RepositoryMetadata(full_name=data["full_name"], url=web_url(data["html_url"]), description=data.get("description"), language=data.get("language"), stars=data.get("stargazers_count", 0), forks=data.get("forks_count", 0), default_branch=data["default_branch"], pushed_at=data.get("pushed_at"), license=(data.get("license") or {}).get("spdx_id"))
        except (KeyError, ValueError, TypeError):
            return RepositoryResponse(repository=None, files=[], providers=[ProviderStatus(provider="github", status="error", detail="Invalid repository metadata")])
        files, statuses = [], [status]
        for path in paths:
            content, file_status = await self.fetch("github", (owner.casefold(), repo.casefold(), path, metadata.default_branch), base + "/contents/" + quote(path, safe="/"), params={"ref": metadata.default_branch}, headers=headers, ttl=1800, max_bytes=200_000)
            statuses.append(file_status)
            if content is None:
                files.append(SourceFile(path=path, status="error", detail=file_status.detail or file_status.status))
                continue
            if content.get("type") != "file" or content.get("encoding") != "base64":
                files.append(SourceFile(path=path, status="unsupported"))
                continue
            try:
                if int(content.get("size", 65537)) > 65536:
                    files.append(SourceFile(path=path, status="too_large"))
                    continue
                decoded = base64.b64decode(content["content"], validate=False)
                if len(decoded) > 65536:
                    files.append(SourceFile(path=path, status="too_large"))
                    continue
                text = decoded.decode("utf-8")
                if "\x00" in text:
                    raise ValueError()
                files.append(SourceFile(path=path, status="ok", content=text, sha=content["sha"], url=web_url(content.get("html_url"))))
            except (KeyError, ValueError, TypeError, UnicodeError):
                files.append(SourceFile(path=path, status="unsupported", detail="Only bounded UTF-8 source files are supported"))
        return RepositoryResponse(repository=metadata, files=files, providers=statuses)
