import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [activeView, setActiveView] = useState("signin");
  const [token, setToken] = useState(localStorage.getItem("climate_token") || "");
  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);
  const [posts, setPosts] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [signupData, setSignupData] = useState({ name: "", email: "", password: "" });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [profileForm, setProfileForm] = useState({ name: "", location: "", bio: "" });
  const [postForm, setPostForm] = useState({ title: "", content: "", category: "Ask for Help" });
  const [replyDrafts, setReplyDrafts] = useState({});

  useEffect(() => {
    if (token) {
      fetchProfile();
      loadData();
    }
  }, [token]);

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };

  const setSession = (receivedToken, profile) => {
    localStorage.setItem("climate_token", receivedToken);
    setToken(receivedToken);
    setUser(profile);
    setActiveView("dashboard");
    setErrorMessage("");
  };

  const signUp = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("Signing up...");
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(signupData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Sign up failed");
      }
      setSession(data.access_token, data.user);
      setStatusMessage("Welcome! Your climate action journey has started.");
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const signIn = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("Signing in...");
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Sign in failed");
      }
      setSession(data.access_token, data.user);
      setStatusMessage("Signed in successfully.");
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await response.json();
      if (response.ok) {
        setUser(profile);
        setProfileForm({ name: profile.name, location: profile.location, bio: profile.bio });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    try {
      const [newsRes, postsRes, rewardsRes] = await Promise.all([
        fetch(`${API_BASE}/news`),
        fetch(`${API_BASE}/community/posts`),
        fetch(`${API_BASE}/rewards`),
      ]);
      const [newsData, postsData, rewardsData] = await Promise.all([
        newsRes.json(),
        postsRes.json(),
        rewardsRes.json(),
      ]);
      setNews(newsData);
      setPosts(postsData);
      setRewards(rewardsData);
    } catch (error) {
      console.error(error);
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("Updating profile...");
    try {
      const response = await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Update failed");
      }
      setUser(data);
      setStatusMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const completeAction = async (newsId) => {
    setStatusMessage("Completing action...");
    try {
      const response = await fetch(`${API_BASE}/news/${newsId}/action`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Action failed");
      }
      await fetchProfile();
      setStatusMessage(data.message);
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const createPost = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("Publishing your post...");
    try {
      const response = await fetch(`${API_BASE}/community/posts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(postForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Post failed");
      }
      setPosts([data, ...posts]);
      setPostForm({ title: "", content: "", category: "Ask for Help" });
      setStatusMessage("Post published in the community.");
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const replyToPost = async (postId) => {
    const message = replyDrafts[postId];
    if (!message) return;
    setErrorMessage("");
    setStatusMessage("Posting reply...");
    try {
      const response = await fetch(`${API_BASE}/community/posts/${postId}/reply`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Reply failed");
      }
      setPosts(
        posts.map((post) =>
          post.id === postId
            ? { ...post, replies: [...post.replies, data] }
            : post
        )
      );
      setReplyDrafts({ ...replyDrafts, [postId]: "" });
      setStatusMessage("Reply posted.");
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const claimReward = async (rewardId) => {
    setStatusMessage("Claiming reward...");
    try {
      const response = await fetch(`${API_BASE}/rewards/claim`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ reward_id: rewardId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Claim failed");
      }
      await fetchProfile();
      setStatusMessage(data.message);
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage("");
    }
  };

  const signOut = () => {
    localStorage.removeItem("climate_token");
    setToken("");
    setUser(null);
    setActiveView("signin");
    setStatusMessage("");
    setErrorMessage("");
  };

  const navButton = (id, label) => (
    <button
      className={activeView === id ? "nav-button active" : "nav-button"}
      onClick={() => setActiveView(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="App">
      <div className="topbar">
        <div>
          <h1>Climate Action Hub</h1>
          <p>Learn, connect, act, and earn rewards for fighting climate change.</p>
        </div>
        {user && (
          <div className="topbar-info">
            <span>{user.name}</span>
            <button className="secondary-button" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>

      {!token ? (
        <main className="content-card auth-card">
          <div className="auth-tabs">
            <button
              className={activeView === "signin" ? "tab active" : "tab"}
              onClick={() => setActiveView("signin")}
            >
              Sign In
            </button>
            <button
              className={activeView === "signup" ? "tab active" : "tab"}
              onClick={() => setActiveView("signup")}
            >
              Sign Up
            </button>
          </div>

          {activeView === "signin" ? (
            <form className="form-grid" onSubmit={signIn}>
              <label>
                Email
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </label>
              <button className="primary-button">Sign In</button>
            </form>
          ) : (
            <form className="form-grid" onSubmit={signUp}>
              <label>
                Full Name
                <input
                  type="text"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                />
              </label>
              <button className="primary-button">Create Account</button>
            </form>
          )}

          {statusMessage && <p className="message success">{statusMessage}</p>}
          {errorMessage && <p className="message error">{errorMessage}</p>}
        </main>
      ) : (
        <div className="dashboard">
          <aside className="sidebar">
            {navButton("dashboard", "Dashboard")}
            {navButton("news", "Climate News")}
            {navButton("community", "Community")}
            {navButton("rewards", "Rewards")}
            {navButton("profile", "Profile")}
          </aside>

          <main className="content-card main-view">
            {statusMessage && <p className="message success">{statusMessage}</p>}
            {errorMessage && <p className="message error">{errorMessage}</p>}

            {activeView === "dashboard" && (
              <section>
                <h2>Welcome back, {user.name}</h2>
                <div className="dashboard-grid">
                  <div className="dashboard-panel">
                    <h3>Your Climate Profile</h3>
                    <p>{user.bio || "Grow your profile with a brief mission statement."}</p>
                    <div className="stats-row">
                      <div>
                        <span>{user.points}</span>
                        <small>Points</small>
                      </div>
                      <div>
                        <span>{user.location}</span>
                        <small>Location</small>
                      </div>
                      <div>
                        <span>{user.joined}</span>
                        <small>Joined</small>
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-panel highlight-panel">
                    <h3>Action Today</h3>
                    <p>
                      Explore the latest news, join the community, or claim rewards to keep your climate impact rising.
                    </p>
                    <button className="primary-button" onClick={() => setActiveView("news")}>Start with the latest news</button>
                  </div>
                </div>
              </section>
            )}

            {activeView === "news" && (
              <section>
                <h2>Climate News & Actions</h2>
                <div className="cards-grid">
                  {news.map((item) => (
                    <article key={item.id} className="card">
                      <h3>{item.title}</h3>
                      <p className="source">Source: {item.source}</p>
                      <p>{item.summary}</p>
                      <p className="action-text">Suggested action: {item.action}</p>
                      <button className="secondary-button" onClick={() => completeAction(item.id)}>
                        Complete action +{item.points} points
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeView === "community" && (
              <section>
                <h2>Community Section</h2>
                <form className="form-grid" onSubmit={createPost}>
                  <label>
                    Post Title
                    <input
                      type="text"
                      value={postForm.title}
                      onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={postForm.category}
                      onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                    >
                      <option>Ask for Help</option>
                      <option>Action Sharing</option>
                      <option>Local Events</option>
                      <option>Stories</option>
                    </select>
                  </label>
                  <label>
                    Message
                    <textarea
                      rows="4"
                      value={postForm.content}
                      onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                      required
                    />
                  </label>
                  <button className="primary-button">Share with the community</button>
                </form>

                <div className="cards-grid">
                  {posts.map((post) => (
                    <article key={post.id} className="card">
                      <div className="card-header">
                        <div>
                          <h3>{post.title}</h3>
                          <p className="source">By {post.author} ? {new Date(post.created_at).toLocaleString()}</p>
                        </div>
                        <span className="tag">{post.category}</span>
                      </div>
                      <p>{post.content}</p>
                      <div className="replies">
                        {post.replies.length > 0 && <strong>Replies</strong>}
                        {post.replies.map((reply, index) => (
                          <div key={index} className="reply">
                            <span>{reply.author}</span>
                            <p>{reply.message}</p>
                          </div>
                        ))}
                      </div>
                      <div className="reply-form">
                        <input
                          type="text"
                          value={replyDrafts[post.id] || ""}
                          placeholder="Write a reply..."
                          onChange={(e) => setReplyDrafts({ ...replyDrafts, [post.id]: e.target.value })}
                        />
                        <button className="secondary-button" onClick={() => replyToPost(post.id)}>
                          Reply
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeView === "rewards" && (
              <section>
                <h2>Rewards</h2>
                <p>Your current points: <strong>{user.points}</strong></p>
                <div className="cards-grid reward-grid">
                  {rewards.map((reward) => (
                    <article key={reward.id} className="card reward-card">
                      <h3>{reward.title}</h3>
                      <p>{reward.description}</p>
                      <div className="reward-footer">
                        <span>{reward.cost_points} points</span>
                        <button className="secondary-button" onClick={() => claimReward(reward.id)}>
                          Claim reward
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeView === "profile" && (
              <section>
                <h2>Your Profile</h2>
                <form className="form-grid" onSubmit={updateProfile}>
                  <label>
                    Name
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Location
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    />
                  </label>
                  <label>
                    About Me
                    <textarea
                      rows="4"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    />
                  </label>
                  <button className="primary-button">Save Profile</button>
                </form>
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
