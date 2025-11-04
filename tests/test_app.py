import uuid

from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


def unique_email():
    return f"test-{uuid.uuid4().hex}@example.com"


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic sanity check for known activity
    assert "Chess Club" in data


def test_signup_and_duplicate():
    activity = "Chess Club"
    email = unique_email()

    # ensure clean start for this email
    assert email not in activities[activity]["participants"]

    # sign up
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    j = resp.json()
    assert "Signed up" in j["message"]
    assert email in activities[activity]["participants"]

    # duplicate signup should return 400
    resp2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp2.status_code == 400


def test_unregister():
    activity = "Programming Class"
    email = unique_email()

    # register first
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # now unregister
    r2 = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert r2.status_code == 200
    data = r2.json()
    assert "Unregistered" in data["message"]
    assert email not in activities[activity]["participants"]


def test_unregister_not_signed():
    activity = "Programming Class"
    email = unique_email()
    # attempt to unregister someone who isn't signed up
    r = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert r.status_code == 400
