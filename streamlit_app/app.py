import streamlit as st
import requests
import json

API_URL = "http://api:8000/api/v1"

st.set_page_config(page_title="Adaptive Learning System", page_icon="🎓", layout="wide")

if "token" not in st.session_state:
    st.session_state.token = None
if "user" not in st.session_state:
    st.session_state.user = None
if "otp_email" not in st.session_state:
    st.session_state.otp_email = None

def get_headers():
    return {"Authorization": f"Bearer {st.session_state.token}"}

def login(email, password):
    resp = requests.post(f"{API_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        if "access_token" in data:
            st.session_state.token = data["access_token"]
            fetch_me()
            st.rerun()
        else:
            st.session_state.otp_email = email
            st.success("OTP sent to your email!")
    else:
        st.error(resp.json().get("detail", "Login failed"))

def fetch_me():
    resp = requests.get(f"{API_URL}/auth/me", headers=get_headers())
    if resp.status_code == 200:
        st.session_state.user = resp.json()

def verify_otp(otp):
    resp = requests.post(f"{API_URL}/auth/verify-otp", json={"email": st.session_state.otp_email, "otp": otp})
    if resp.status_code == 200:
        data = resp.json()
        st.session_state.token = data["access_token"]
        st.session_state.otp_email = None
        fetch_me()
        st.rerun()
    else:
        st.error(resp.json().get("detail", "OTP Verification failed"))

def demo_register():
    resp = requests.post(f"{API_URL}/auth/demo-register")
    if resp.status_code == 200:
        st.session_state.token = resp.json()["access_token"]
        fetch_me()
        st.rerun()
    else:
        st.error("Demo registration failed.")

def register(email, password, name):
    payload = {
        "email": email,
        "password": password,
        "full_name": name,
        "skill_level": "beginner",
        "preferred_topics": [],
        "learning_goals": []
    }
    resp = requests.post(f"{API_URL}/auth/register", json=payload)
    if resp.status_code == 201:
        st.session_state.otp_email = email
        st.success("Registration successful! OTP sent to your email.")
    else:
        st.error(resp.json().get("detail", "Registration failed"))

def logout():
    st.session_state.token = None
    st.session_state.user = None
    st.session_state.otp_email = None
    st.rerun()

# ----------------- UI -----------------

if not st.session_state.token:
    st.title("🎓 Adaptive Learning System")
    
    if st.session_state.otp_email:
        st.subheader("Verify OTP")
        otp_code = st.text_input("Enter OTP Code")
        if st.button("Verify"):
            verify_otp(otp_code)
        if st.button("Cancel"):
            st.session_state.otp_email = None
            st.rerun()
    else:
        tab1, tab2, tab3 = st.tabs(["Login", "Register", "Demo Access"])
        
        with tab1:
            st.subheader("Login")
            l_email = st.text_input("Email", key="l_email")
            l_pass = st.text_input("Password", type="password", key="l_pass")
            if st.button("Login"):
                login(l_email, l_pass)
                
        with tab2:
            st.subheader("Register")
            r_name = st.text_input("Full Name")
            r_email = st.text_input("Email", key="r_email")
            r_pass = st.text_input("Password", type="password", key="r_pass")
            if st.button("Register"):
                register(r_email, r_pass, r_name)
                
        with tab3:
            st.subheader("Demo Shortcuts")
            if st.button("Admin Demo Login"):
                login("admin@example.com", "admin123")
            if st.button("Student Demo Login"):
                login("student@example.com", "student123")
            if st.button("Continue as Demo Learner"):
                demo_register()
else:
    st.sidebar.title(f"Welcome, {st.session_state.user.get('full_name', 'User')}")
    if st.sidebar.button("Logout"):
        logout()
        
    st.title("Dashboard")
    
    st.subheader("Recommendations")
    try:
        rec_resp = requests.get(f"{API_URL}/recommendations/", headers=get_headers())
        if rec_resp.status_code == 200:
            recs = rec_resp.json()
            if not recs:
                st.info("No recommendations yet. Interact with some content!")
            else:
                for r in recs:
                    st.write(f"**{r.get('title')}**")
                    st.write(str(r.get('description', '')))
                    st.markdown("---")
        else:
            st.error("Failed to load recommendations.")
    except Exception as e:
        st.error(f"Error fetching recommendations: {e}")
        
    st.subheader("All Content")
    try:
        content_resp = requests.get(f"{API_URL}/content/", headers=get_headers())
        if content_resp.status_code == 200:
            content = content_resp.json()
            for c in content:
                with st.expander(c["title"]):
                    st.write(c.get("description", ""))
                    st.write(f"**Topic**: {c.get('topic')} | **Level**: {c.get('difficulty_level')}")
                    col1, col2, col3 = st.columns(3)
                    if col1.button("View", key=f"v_{c['id']}"):
                        requests.post(f"{API_URL}/interactions/", json={"content_id": c["id"], "interaction_type": "view"}, headers=get_headers())
                        st.success("Viewed!")
                    if col2.button("Like", key=f"l_{c['id']}"):
                        requests.post(f"{API_URL}/interactions/", json={"content_id": c["id"], "interaction_type": "rate", "rating": 5}, headers=get_headers())
                        st.success("Liked!")
                    if col3.button("Complete", key=f"c_{c['id']}"):
                        requests.post(f"{API_URL}/interactions/", json={"content_id": c["id"], "interaction_type": "complete"}, headers=get_headers())
                        st.success("Completed!")
        else:
            st.error("Failed to load content.")
    except Exception as e:
        st.error(f"Error fetching content: {e}")
