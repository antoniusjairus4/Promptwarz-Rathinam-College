"""Bound request memory and per-process demo abuse; not a distributed firewall."""
from collections import OrderedDict
import asyncio
import time

from starlette.responses import JSONResponse


class BodyTooLarge(Exception):
    pass


class BodyReceiveTimeout(Exception):
    pass


class RequestLimits:
    def __init__(self, app, max_bytes=262144, requests_per_minute=30, max_inflight=4):
        self.app = app
        self.max_bytes = max_bytes
        self.requests_per_minute = requests_per_minute
        self.max_inflight = max_inflight
        self.inflight = 0
        self.windows = OrderedDict()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        original_send = send
        async def secure_send(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([(b"cache-control", b"no-store"), (b"x-content-type-options", b"nosniff")])
                message = {**message, "headers": headers}
            await original_send(message)
        send = secure_send
        headers = dict(scope.get("headers", []))
        try:
            too_large = int(headers.get(b"content-length", b"0")) > self.max_bytes
        except ValueError:
            return await JSONResponse({"detail": "Invalid Content-Length"}, 400)(scope, receive, send)
        if too_large:
            return await JSONResponse({"detail": "Request body exceeds 256 KiB limit"}, 413)(scope, receive, send)
        # Do not trust arbitrary X-Forwarded-For values for identity.
        limited = scope["method"] in {"POST", "PATCH"}
        if limited:
            key = (scope.get("client") or ("unknown",))[0]
            now = time.monotonic()
            start, count = self.windows.pop(key, (now, 0))
            if now - start >= 60:
                start, count = now, 0
            self.windows[key] = (start, count + 1)
            while len(self.windows) > 2048:
                self.windows.popitem(last=False)
            if count >= self.requests_per_minute or self.inflight >= self.max_inflight:
                return await JSONResponse({"detail": "Request limit reached; retry shortly"}, 429, headers={"Retry-After": "60"})(scope, receive, send)
            self.inflight += 1
        total = 0
        async def bounded_receive():
            nonlocal total
            message = await receive()
            total += len(message.get("body", b""))
            if total > self.max_bytes:
                raise BodyTooLarge()
            return message
        # Buffer only bounded write bodies before FastAPI parses JSON. This also
        # handles chunked requests and avoids converting receive exceptions to 400.
        try:
            buffered = None
            if scope["method"] in {"POST", "PATCH", "PUT"}:
                buffered = bytearray()
                try:
                    async with asyncio.timeout(10):
                        while True:
                            message = await bounded_receive()
                            if message["type"] == "http.disconnect":
                                return
                            buffered.extend(message.get("body", b""))
                            if not message.get("more_body", False):
                                break
                except TimeoutError:
                    raise BodyReceiveTimeout() from None
            consumed = False
            async def replay():
                nonlocal consumed
                if not consumed:
                    consumed = True
                    return {"type": "http.request", "body": bytes(buffered), "more_body": False}
                return await receive()
            await self.app(scope, replay if buffered is not None else bounded_receive, send)
        except BodyTooLarge:
            await JSONResponse({"detail": "Request body exceeds 256 KiB limit"}, 413)(scope, receive, send)
        except BodyReceiveTimeout:
            await JSONResponse({"detail": "Request body receive timed out"}, 408)(scope, receive, send)
        finally:
            if limited:
                self.inflight -= 1
