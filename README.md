# FridgePeace

A PWA for managing shared kitchen spaces and tracking food expiry.

Live: https://fridgepeace.me
Hosted on Cloudflare with Render for backend

This is a project for Monash University and will not be actively maintained.

## Tech stack

- **Frontend:** React, Tailwind CSS, Webpack
- **Backend:** FastAPI, SQLAlchemy, SQLite

## Setup

### Requirements

- Node.js >= 24
- Python 3

### Setup

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend && pip install -r requirements.txt
```

Create the environment:

```bash
cp ./.env.example ./.env
```

You will need to sign up for an [Open Food Facts](https://world.openfoodfacts.org) account. It's free, but helps them to manage the rate limits of their API.
Populate the `OFF_USER` and `OFF_PASSWORD` with your account details.

## Running locally

We've included a simple command to run both the backend and frontend.

```bash
npm run start
```

The server will start, using ports 4040 for the UI and and 8000 for the API.
If you need to change this, please edit the values in `webpack.config.js` and `package.json`.

Hopefully you don't have problems, if you're not our lecturer we can't really help...

## Our Team!

- Asad Ali
- Shelley Bassett
- Max Jones
- Mingjun Lyu
- Charlie (Zhaohua) Qi
