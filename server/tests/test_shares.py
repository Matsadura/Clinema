"""Shareable, read-only watchlists."""
from tests.conftest import register_and_login


def _save(client, uid, h, tmdb_id):
    assert client.put(f"/api/{uid}/library/{tmdb_id}", headers=h,
                      json={"save": True}).status_code == 200


def test_share_lifecycle(client, catalog):
    for i, title in ((1, "Heat"), (2, "Thief"), (3, "Ronin")):
        catalog.add(i, title, 1990 + i, ["Crime"], f"D{i}")
    uid, h = register_and_login(client)
    _save(client, uid, h, 1)
    _save(client, uid, h, 2)
    client.put(f"/api/{uid}/library/3", headers=h, json={"like": True})

    assert client.get(f"/api/{uid}/watchlist/share", headers=h) \
        .get_json() == {"enabled": False, "share_id": None}
    on = client.put(f"/api/{uid}/watchlist/share", headers=h,
                    json={"enabled": True}).get_json()
    sid = on["share_id"]
    assert on["enabled"] and len(sid) >= 20

    public = client.get(f"/api/shared/{sid}").get_json()
    assert public["owner"] == "Ada"
    assert [m["title"] for m in public["movies"]] == ["Thief", "Heat"]
    assert "email" not in str(public)  # liked-only film and email hidden

    # Enabling again keeps the link; rotating replaces it
    again = client.put(f"/api/{uid}/watchlist/share", headers=h,
                       json={"enabled": True}).get_json()
    assert again["share_id"] == sid
    rotated = client.put(f"/api/{uid}/watchlist/share", headers=h,
                         json={"enabled": True, "rotate": True}).get_json()
    assert rotated["share_id"] != sid
    assert client.get(f"/api/shared/{sid}").status_code == 404

    client.put(f"/api/{uid}/watchlist/share", headers=h,
               json={"enabled": False})
    assert client.get(f"/api/shared/{rotated['share_id']}") \
        .status_code == 404


def test_share_requires_owner_and_valid_input(client):
    uid, h = register_and_login(client)
    other, h2 = register_and_login(client, email="bob@example.com")
    assert client.put(f"/api/{uid}/watchlist/share",
                      json={"enabled": True}).status_code == 401
    assert client.put(f"/api/{uid}/watchlist/share", headers=h2,
                      json={"enabled": True}).status_code == 403
    assert client.put(f"/api/{uid}/watchlist/share", headers=h,
                      json={"enabled": "yes"}).status_code == 400
    assert client.get("/api/shared/short").status_code == 404
    assert client.get("/api/shared/" + "x" * 22).status_code == 404
