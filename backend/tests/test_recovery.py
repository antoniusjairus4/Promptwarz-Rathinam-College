"""Targeted regressions for genuine production failure paths; upstream fixtures are synthetic."""
import asyncio
import httpx
from fastapi.testclient import TestClient
from pymongo.errors import AutoReconnect

from app.core.config import Settings
from app.db.repository import MongoRepository
from app.main import create_app
from app.services.external import ExternalServices
from app.services.github_analysis import GithubInspector
from test_journey import client, new_session, github_handler, NoWait
from test_reliability import DriverClient, DriverCollection


def test_github_files_overlap_but_same_key_requests_are_coalesced():
    async def scenario():
        active = peak = requests = 0
        async def handler(request):
            nonlocal active, peak, requests
            requests += 1
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(.02)
            response = github_handler(request)
            active -= 1
            return response
        svc = ExternalServices(Settings(_env_file=None, github_token='test-token'), httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        svc.next_request = NoWait()
        try:
            result = await svc.github('test', 'repo', ['app.py','tests/test_app.py','README.md'])
            assert all(file.status == 'ok' for file in result.files)
            assert 2 <= peak <= 3
            before = requests
            await asyncio.gather(*(svc.fetch('github', ('same-key',), 'https://api.github.com/repos/test/repo', headers=svc.github_headers()) for _ in range(3)))
            assert requests == before + 1
        finally:
            await svc.close()
    asyncio.run(scenario())


def test_session_github_import_returns_files_and_restores_findings(client):
    sid,headers = new_session(client)
    body = {'session_id':sid,'target':'https://github.com/test/repo','paths':['app.py']}
    result = client.post('/api/github/analyze',headers=headers,json=body)
    assert result.status_code == 200
    repository = result.json()['repositories'][0]
    assert repository['files'][0]['sha'] and repository['findings']
    restored = client.get('/api/sessions/'+sid,headers=headers).json()
    assert restored['github_repositories'][0] == repository
    assert client.post('/api/github/analyze',headers=headers,json={**body,'paths':['../.env']}).status_code == 422


def test_partial_github_timeout_keeps_metadata_and_does_not_enumerate_recursively(monkeypatch):
    async def scenario():
        original_timeout = asyncio.timeout
        monkeypatch.setattr(asyncio, 'timeout', lambda seconds: original_timeout(.05 if seconds == 20 else seconds))
        async def handler(request):
            assert 'recursive' not in request.url.params
            if '/git/trees/' in request.url.path:
                await asyncio.sleep(1)
            return github_handler(request)
        svc = ExternalServices(Settings(_env_file=None, github_token='test-token'), httpx.AsyncClient(transport=httpx.MockTransport(handler)))
        svc.next_request = NoWait()
        events=[]
        try:
            result=await GithubInspector(svc).inspect('test/repo', events)
            assert result['repositories'][0].repository.full_name == 'test/repo'
            assert result['repositories'][0].limitations[-1].startswith('Inspection incomplete')
            assert events[-1]['status']=='failed'
        finally:
            await svc.close()
    asyncio.run(scenario())


def test_storage_status_detects_outage_and_recovery_without_replacing_data():
    collection=DriverCollection()
    class Admin:
        def command(self, name):
            if collection.failed:
                raise AutoReconnect('Synthetic outage')
            return {'ok':1}
    driver=DriverClient(collection)
    driver.admin=Admin()
    repository=MongoRepository(driver,'synthetic')
    with TestClient(create_app(Settings(_env_file=None),repository)) as client:
        sid,headers=new_session(client)
        assert client.get('/api/v1/status').json()['durable'] is True
        collection.failed=True
        assert client.get('/api/v1/status').json()['durable'] is False
        assert client.get('/api/sessions/'+sid,headers=headers).status_code == 503
        assert client.get('/api/health').status_code == 200
        collection.failed=False
        assert client.get('/api/v1/status').json()['durable'] is True
        assert client.get('/api/sessions/'+sid,headers=headers).status_code == 200


def test_metadata_only_refresh_preserves_saved_source_and_profile(client, monkeypatch):
    from app.models.journey import RepositoryInspection
    sid,headers=new_session(client)
    body={'session_id':sid,'target':'test/repo'}
    first=client.post('/api/github/analyze',headers=headers,json=body).json()['repositories'][0]
    assert client.post('/api/profile/analyze',headers=headers,json={'session_id':sid}).status_code==200
    async def partial(self, target, events, paths=None):
        return {'repositories':[RepositoryInspection(repository=first['repository'],tree_sha=None,inspected_paths=[],architecture_paths=[],findings=[],limitations=['Synthetic partial failure'])],'providers':[]}
    monkeypatch.setattr(GithubInspector,'inspect',partial)
    result=client.post('/api/github/analyze',headers=headers,json=body)
    assert result.status_code==200
    assert result.json()['repositories'][0]['findings']==first['findings']
    restored=client.get('/api/sessions/'+sid,headers=headers).json()
    assert restored['profile_analysis'] is not None
    assert restored['github_repositories'][0]['files']==first['files']
