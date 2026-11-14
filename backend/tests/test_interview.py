"""Interview fixtures are synthetic test responses, never runtime fallback."""
from fastapi.testclient import TestClient
from app.core.config import Settings
from app.db.repository import MemoryRepository
from app.main import create_app
from app.models.interview import QuestionDraft, FeedbackDraft, SummaryDraft
from app.services.inference import InferenceUnavailable
from test_journey import JourneyGenerator, new_session


class InterviewGenerator(JourneyGenerator):
    def generate(self, instruction, payload, schema):
        self.payloads.append((schema, payload))
        if schema is QuestionDraft:
            number = len(payload["interview"]["questions"]) + 1
            data = {"question": f"Synthetic practice question {number}: explain an HTTP design decision.", "focus": "HTTP reasoning"}
        elif schema is FeedbackDraft:
            assert "approved_transcript" in payload
            data = dict(technical_accuracy=6, clarity=7, completeness=5, relevance=8,
                        feedback="Synthetic feedback for tests only", improvements=["Explain tradeoffs"],
                        stronger_answer="Hypothetically, I would compare the options and validate the tradeoff.")
        elif schema is SummaryDraft:
            assert len(payload["interview"]["answers"]) == 5
            data = dict(summary="Synthetic five-answer summary", strengths=["Clarity"], improvement_areas=["Depth"], next_steps=["Practice HTTP tradeoffs"])
        else:
            return super().generate(instruction, payload, schema)
        return schema.model_validate(data), "synthetic_test_provider", "synthetic_test_model"


def make_client():
    return TestClient(create_app(Settings(_env_file=None, storage_backend="memory"), MemoryRepository(), InterviewGenerator()))


def test_complete_interview_persists_and_does_not_change_skill_verification():
    with make_client() as client:
        sid, headers = new_session(client)
        assert client.get('/api/interviews/current', params={'session_id': sid}, headers=headers).json()['interview'] is None
        result = client.post('/api/interviews/start', headers=headers, json={'session_id':sid,'interview_type':'mixed','difficulty':'advanced'})
        assert result.status_code == 200
        interview = result.json()['interview']
        action = {'session_id':sid,'interview_id':interview['id']}
        assert client.post('/api/interviews/next',headers=headers,json=action).status_code == 409
        assert client.post('/api/interviews/summary',headers=headers,json=action).status_code == 409
        for index in range(5):
            question = interview['questions'][-1]
            body = {**action,'question_id':question['id'],'transcript':'I would explain the design and tradeoffs.'}
            answer = client.post('/api/interviews/answer',headers=headers,json=body)
            assert answer.status_code == 200
            interview = answer.json()['interview']
            assert len(interview['answers']) == index + 1
            assert client.post('/api/interviews/answer',headers=headers,json=body).json()['interview'] == interview
            if index < 4:
                interview = client.post('/api/interviews/next',headers=headers,json=action).json()['interview']
        assert client.post('/api/interviews/next',headers=headers,json=action).status_code == 409
        summary = client.post('/api/interviews/summary',headers=headers,json=action)
        assert summary.status_code == 200 and summary.json()['interview']['summary']['next_steps']
        restored = client.get('/api/interviews/current',headers=headers,params={'session_id':sid}).json()
        assert restored == summary.json()
        assert restored['storage']['durable'] is False
        public = client.get('/api/sessions/'+sid,headers=headers).json()
        assert all(skill['verified'] is False for skill in public['learner']['skills'])
        assert 'token_hash' not in summary.text
        payloads = client.app.state.workflow.generator.payloads
        assert any(schema is QuestionDraft and payload['learner']['target_role'] == 'Wildlife Conservation Planner' for schema,payload in payloads)


def test_interview_authorization_validation_and_wrong_question():
    with make_client() as client:
        sid, headers = new_session(client)
        body = {'session_id':sid}
        assert client.post('/api/interviews/start',json=body).status_code == 401
        assert client.get('/api/interviews/current',params=body,headers={'Authorization':'Bearer wrong'}).status_code == 404
        assert client.post('/api/interviews/start',json={**body,'difficulty':'impossible'},headers=headers).status_code == 422
        interview = client.post('/api/interviews/start',json=body,headers=headers).json()['interview']
        action = {**body,'interview_id':interview['id'],'question_id':interview['questions'][0]['id']}
        assert client.post('/api/interviews/answer',json={**action,'transcript':' '*5},headers=headers).status_code == 422
        assert client.post('/api/interviews/answer',json={**action,'question_id':'wrong','transcript':'Text'},headers=headers).status_code == 409
        assert client.post('/api/interviews/answer',json={**action,'transcript':'x'*6001},headers=headers).status_code == 422


def test_interview_provider_failure_preserves_previous_interview():
    with make_client() as client:
        sid, headers = new_session(client)
        original = client.post('/api/interviews/start',json={'session_id':sid},headers=headers).json()['interview']
        class Failed:
            def generate(self, *args):
                raise InferenceUnavailable()
        client.app.state.workflow.generator = Failed()
        assert client.post('/api/interviews/start',json={'session_id':sid},headers=headers).status_code == 503
        restored = client.get('/api/interviews/current',params={'session_id':sid},headers=headers).json()['interview']
        assert restored == original
        assert restored['answers'] == []
