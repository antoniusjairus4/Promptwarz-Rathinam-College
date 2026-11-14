"""Manually curated official free links; never LLM-generated course listings."""
from app.models.integrations import LearningResource

CATALOG = [
    LearningResource(id="fcc-python", title="Scientific Computing with Python", provider="freeCodeCamp", url="https://www.freecodecamp.org/learn/scientific-computing-with-python", kind="course", topics=["python", "programming"], provenance="curated_official", reviewed_on="2026-11-14"),
    LearningResource(id="fcc-web", title="Responsive Web Design", provider="freeCodeCamp", url="https://www.freecodecamp.org/learn/responsive-web-design", kind="course", topics=["html", "css", "web", "frontend"], provenance="curated_official", reviewed_on="2026-11-14"),
    LearningResource(id="mit-python", title="Introduction to Computer Science and Programming in Python", provider="MIT OpenCourseWare", url="https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/", kind="course", topics=["python", "computer science", "programming"], provenance="curated_official", reviewed_on="2026-11-14"),
    LearningResource(id="python-tutorial", title="The Python Tutorial", provider="Python documentation", url="https://docs.python.org/3/tutorial/", kind="documentation", topics=["python", "programming"], provenance="curated_official", reviewed_on="2026-11-14"),
    LearningResource(id="mdn-web", title="Learn web development", provider="MDN", url="https://developer.mozilla.org/en-US/docs/Learn_web_development", kind="documentation", topics=["web", "html", "css", "javascript", "frontend"], provenance="curated_official", reviewed_on="2026-11-14"),
]


def search_catalog(query: str) -> list[LearningResource]:
    words = query.casefold().split()
    return [item.model_copy(deep=True) for item in CATALOG if all(word in (item.title + " " + item.provider + " " + " ".join(item.topics)).casefold() for word in words)]
