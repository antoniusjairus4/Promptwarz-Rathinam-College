"""Opt-in live checks. Never prints keys, connection strings, SDK exceptions or prompts."""
import argparse
import socket

import httpx
from openai import OpenAI
from pymongo import MongoClient
from pymongo.uri_parser import parse_uri

from app.core.config import Settings


def nvidia(settings):
    if not settings.nvidia_api_key.get_secret_value() or not settings.nvidia_model:
        print("NVIDIA: key or model not configured")
        return False
    try:
        with httpx.Client(timeout=20) as client:
            response = client.get(settings.nvidia_base_url + "/models", headers={"Authorization": "Bearer " + settings.nvidia_api_key.get_secret_value()})
            response.raise_for_status()
            exists = settings.nvidia_model in [row["id"] for row in response.json().get("data", [])]
        print("NVIDIA selected model listed:", exists)
        if not exists:
            return False
        with OpenAI(api_key=settings.nvidia_api_key.get_secret_value(), base_url=settings.nvidia_base_url, timeout=settings.llm_timeout_seconds, max_retries=0) as client:
            result = client.chat.completions.create(model=settings.nvidia_model, messages=[{"role": "user", "content": "Reply with exactly OK."}], max_tokens=1024, extra_body={"chat_template_kwargs": {"enable_thinking": False}})
        passed = result.choices[0].message.content is not None and result.choices[0].message.content.strip() == "OK"
        print("NVIDIA minimal inference:", "PASS" if passed else "FAIL (no expected output)")
        return passed
    except Exception as exc:
        print("NVIDIA failure category:", type(exc).__name__, "HTTP:", getattr(exc, "status_code", None))
        return False


def mongodb(settings):
    uri = settings.mongodb_uri.get_secret_value()
    if not uri:
        print("MongoDB: not configured")
        return False
    try:
        parsed = parse_uri(uri, connect_timeout=3)
        print("MongoDB scheme:", uri.split(":", 1)[0], "TLS enabled:", bool(parsed["options"].get("tls", parsed["options"].get("ssl", uri.startswith("mongodb+srv://")))))
        for host, port in parsed["nodelist"]:
            try:
                socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
                print("DNS:", host, "PASS; port:", port)
                with socket.create_connection((host, port), timeout=3):
                    pass
                print("TCP: PASS")
            except Exception as exc:
                print("Network exception category:", type(exc).__name__)
        with MongoClient(uri, serverSelectionTimeoutMS=6000, connectTimeoutMS=2500, socketTimeoutMS=2500) as client:
            client.admin.command("ping")
        print("MongoDB authenticated ping: PASS")
        return True
    except Exception as exc:
        print("MongoDB exception category:", type(exc).__name__)
        # Never print exception text; URI or credentials may be embedded by drivers.
        print("Check Atlas cluster status, current client IP access list and outbound TCP 27017. Keep TLS verification enabled. Atlas account access is needed to verify access-list rules.")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--nvidia", action="store_true")
    parser.add_argument("--mongodb", action="store_true")
    arguments = parser.parse_args()
    settings = Settings()
    if arguments.nvidia:
        nvidia(settings)
    if arguments.mongodb:
        mongodb(settings)
