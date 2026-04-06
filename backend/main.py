from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pathlib import Path
from typing import Dict, List, Optional
import hashlib
import json
import secrets
import datetime

BASE_DIR = Path(__file__).resolve().parent
STORE_FILE = BASE_DIR / 'data_store.json'

app = FastAPI(title='Climate Change Awareness API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def load_store() -> Dict:
    if not STORE_FILE.exists():
        STORE_FILE.write_text(json.dumps({
            'users': [],
            'sessions': {},
            'news': [],
            'community': [],
            'rewards': []
        }, indent=2), encoding='utf-8')
    with STORE_FILE.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def save_store(store: Dict):
    with STORE_FILE.open('w', encoding='utf-8') as handle:
        json.dump(store, handle, indent=2)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def get_token_user(store: Dict, token: str) -> Optional[Dict]:
    session = store['sessions'].get(token)
    if not session:
        return None
    return next((user for user in store['users'] if user['id'] == session['user_id']), None)


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authorization header missing or invalid')
    token = authorization.split(' ', 1)[1]
    store = load_store()
    user = get_token_user(store, token)
    if user is None:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    return user


def build_profile(user: Dict) -> Dict:
    return {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'location': user.get('location', 'Global'),
        'bio': user.get('bio', ''),
        'points': user.get('points', 50),
        'joined': user.get('joined', datetime.date.today().isoformat()),
    }


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict


class NewsItem(BaseModel):
    id: int
    title: str
    summary: str
    action: str
    source: str
    points: int


class CommunityPost(BaseModel):
    id: int
    author: str
    title: str
    content: str
    category: str
    created_at: str
    replies: List[Dict]


class NewCommunityPost(BaseModel):
    title: str
    content: str
    category: str


class NewReply(BaseModel):
    message: str


class RewardItem(BaseModel):
    id: int
    title: str
    description: str
    cost_points: int


class ClaimRequest(BaseModel):
    reward_id: int


class ActionResponse(BaseModel):
    message: str
    points: int


def initialize_defaults():
    store = load_store()
    if store['news']:
        return store
    store['news'] = [
        {
            'id': 1,
            'title': 'Heatwaves Intensify Across Multiple Regions',
            'summary': 'Scientists warn that heatwaves are becoming more frequent and dangerous.',
            'action': 'Save energy today by unplugging unused devices and using fans.',
            'source': 'IPCC',
            'points': 15,
        },
        {
            'id': 2,
            'title': 'Community Garden Programs Grow in Cities',
            'summary': 'Urban gardens are helping communities build resilience and lower emissions.',
            'action': 'Join a local garden, volunteer, or start a small home garden.',
            'source': 'Local EPA',
            'points': 10,
        },
        {
            'id': 3,
            'title': 'Renewable Energy Adoption Continues Rising',
            'summary': 'Renewables now provide a larger share of electricity generation.',
            'action': 'Switch to a green energy plan or advocate for renewable policy.',
            'source': 'Climate News',
            'points': 20,
        },
        {
            'id': 4,
            'title': 'Plastic Reduction Campaigns Reach Schools',
            'summary': 'Young people are driving campaigns to reduce single-use plastics.',
            'action': 'Choose reusable bottles, bags, and containers today.',
            'source': 'EcoWatch',
            'points': 12,
        },
    ]
    store['community'] = [
        {
            'id': 1,
            'author': 'Amina',
            'title': 'How can I reduce plastic waste at home?',
            'content': 'I want to switch to reusable products but need tips for the kitchen.',
            'category': 'Sustainable Living',
            'created_at': '2026-04-06T09:00:00Z',
            'replies': [
                {
                    'author': 'Community Helper',
                    'message': 'Start with reusable bags and beeswax wraps for food storage.',
                    'created_at': '2026-04-06T09:45:00Z',
                }
            ],
        },
        {
            'id': 2,
            'author': 'Diego',
            'title': 'Looking for local climate action groups',
            'content': 'Any recommendations for volunteer groups in my area?',
            'category': 'Action & Volunteering',
            'created_at': '2026-04-06T11:20:00Z',
            'replies': [],
        },
    ]
    store['rewards'] = [
        {
            'id': 1,
            'title': 'Reusable Starter Kit',
            'description': 'A welcome pack for sustainable living with reusable essentials.',
            'cost_points': 50,
        },
        {
            'id': 2,
            'title': 'Eco Challenge Badge',
            'description': 'Awarded for completing three climate actions in the app.',
            'cost_points': 30,
        },
        {
            'id': 3,
            'title': 'Plant a Tree Certificate',
            'description': 'Redeem to support a sponsored tree planting program.',
            'cost_points': 70,
        },
        {
            'id': 4,
            'title': 'Community Builder Reward',
            'description': 'For sharing ideas and helping others in the community.',
            'cost_points': 40,
        },
    ]
    save_store(store)
    return store


@app.on_event('startup')
def startup_event():
    initialize_defaults()


@app.get('/status')
def status():
    return {'status': 'ready'}


@app.post('/auth/signup', response_model=TokenResponse)
def signup(request: SignupRequest):
    store = load_store()
    if any(user['email'] == request.email for user in store['users']):
        raise HTTPException(status_code=400, detail='Email is already registered')
    next_id = max((user['id'] for user in store['users']), default=0) + 1
    user = {
        'id': next_id,
        'name': request.name,
        'email': request.email,
        'password_hash': hash_password(request.password),
        'location': 'Global',
        'bio': '',
        'points': 50,
        'joined': datetime.date.today().isoformat(),
    }
    store['users'].append(user)
    token = secrets.token_urlsafe(24)
    store['sessions'][token] = {'user_id': user['id'], 'created_at': datetime.datetime.utcnow().isoformat()}
    save_store(store)
    return {'access_token': token, 'token_type': 'bearer', 'user': build_profile(user)}


@app.post('/auth/login', response_model=TokenResponse)
def login(request: LoginRequest):
    store = load_store()
    user = next((item for item in store['users'] if item['email'] == request.email), None)
    if user is None or user['password_hash'] != hash_password(request.password):
        raise HTTPException(status_code=401, detail='Invalid login credentials')
    token = secrets.token_urlsafe(24)
    store['sessions'][token] = {'user_id': user['id'], 'created_at': datetime.datetime.utcnow().isoformat()}
    save_store(store)
    return {'access_token': token, 'token_type': 'bearer', 'user': build_profile(user)}


@app.get('/users/me', response_model=Dict)
def user_profile(user: Dict = Depends(get_current_user)):
    return build_profile(user)


@app.put('/users/me', response_model=Dict)
def update_profile(update: ProfileUpdate, user: Dict = Depends(get_current_user)):
    store = load_store()
    saved_user = next((item for item in store['users'] if item['id'] == user['id']), None)
    if saved_user is None:
        raise HTTPException(status_code=404, detail='User not found')
    if update.name is not None:
        saved_user['name'] = update.name
    if update.location is not None:
        saved_user['location'] = update.location
    if update.bio is not None:
        saved_user['bio'] = update.bio
    save_store(store)
    return build_profile(saved_user)


@app.get('/news', response_model=List[NewsItem])
def list_news():
    store = load_store()
    return store['news']


@app.post('/news/{news_id}/action', response_model=ActionResponse)
def complete_news_action(news_id: int, user: Dict = Depends(get_current_user)):
    store = load_store()
    news_item = next((item for item in store['news'] if item['id'] == news_id), None)
    if not news_item:
        raise HTTPException(status_code=404, detail='News item not found')
    saved_user = next((item for item in store['users'] if item['id'] == user['id']), None)
    saved_user['points'] = saved_user.get('points', 0) + news_item['points']
    save_store(store)
    return {'message': f"Action completed. You earned {news_item['points']} points!", 'points': saved_user['points']}


@app.get('/community/posts', response_model=List[CommunityPost])
def list_posts():
    store = load_store()
    return sorted(store['community'], key=lambda item: item['created_at'], reverse=True)


@app.post('/community/posts', response_model=CommunityPost)
def create_post(post: NewCommunityPost, user: Dict = Depends(get_current_user)):
    store = load_store()
    next_id = max((item['id'] for item in store['community']), default=0) + 1
    item = {
        'id': next_id,
        'author': user['name'],
        'title': post.title,
        'content': post.content,
        'category': post.category,
        'created_at': datetime.datetime.utcnow().isoformat() + 'Z',
        'replies': [],
    }
    store['community'].append(item)
    save_store(store)
    return item


@app.post('/community/posts/{post_id}/reply', response_model=Dict)
def reply_post(post_id: int, reply: NewReply, user: Dict = Depends(get_current_user)):
    store = load_store()
    post = next((item for item in store['community'] if item['id'] == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail='Post not found')
    new_reply = {
        'author': user['name'],
        'message': reply.message,
        'created_at': datetime.datetime.utcnow().isoformat() + 'Z',
    }
    post['replies'].append(new_reply)
    save_store(store)
    return new_reply


@app.get('/rewards', response_model=List[RewardItem])
def list_rewards():
    store = load_store()
    return store['rewards']


@app.post('/rewards/claim', response_model=ActionResponse)
def claim_reward(request: ClaimRequest, user: Dict = Depends(get_current_user)):
    store = load_store()
    reward = next((item for item in store['rewards'] if item['id'] == request.reward_id), None)
    if reward is None:
        raise HTTPException(status_code=404, detail='Reward not found')
    saved_user = next((item for item in store['users'] if item['id'] == user['id']), None)
    if saved_user.get('points', 0) < reward['cost_points']:
        raise HTTPException(status_code=400, detail='Not enough points to claim this reward')
    saved_user['points'] = saved_user.get('points', 0) - reward['cost_points']
    save_store(store)
    return {'message': f"Reward claimed: {reward['title']}", 'points': saved_user['points']}
