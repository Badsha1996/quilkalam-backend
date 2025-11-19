# Quilkalam Backend API
A serverless Next.js backend for the Quilkalam writing application, deployed on Vercel with NeonDB and Cloudinary.

## 🚀 Features

- **Authentication**: JWT-based auth with bcrypt password hashing
- **User Management**: Profile, followers, following
- **Project Publishing**: Publish writing projects with items/chapters
- **Social Features**: Comments, likes, reading progress
- **Image Upload**: Cloudinary integration for image storage
- **Database**: PostgreSQL via NeonDB serverless

## 📋 Prerequisites

- Node.js 18+ and npm
- NeonDB account (https://neon.tech)
- Cloudinary account (https://cloudinary.com)
- Vercel account (https://vercel.com)

## 🛠️ Local Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd quilkalam-backend
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
INIT_SECRET=your-init-secret-for-db-setup
NODE_ENV=development
```

### 3. Initialize Database

**Option A: Using the API endpoint**
```bash
npm run dev
# Then call:
curl -X GET http://localhost:3000/api/init-db \
  -H "x-init-secret: your-init-secret-for-db-setup"
```

**Option B: Direct SQL (recommended for production)**

Connect to your NeonDB and run the SQL from `lib/db.ts`'s `initializeDatabase()` function.

### 4. Run Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000

## 🌐 Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Import to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `next build`
   - Output Directory: `.next`

### 3. Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
DATABASE_URL=your_neon_database_url
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_secure_jwt_secret
INIT_SECRET=your_init_secret
NODE_ENV=production
```

### 4. Deploy

Click "Deploy" - Vercel will build and deploy automatically.

### 5. Initialize Production Database

After deployment:

```bash
curl -X GET https://your-app.vercel.app/api/init-db \
  -H "x-init-secret: your-init-secret"
```

**Important**: Remove or protect the `/api/init-db` endpoint after initialization.

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User

- `GET /api/user/profile` - Get user profile (authenticated)
- `PUT /api/user/profile` - Update profile (authenticated)

### Projects

- `GET /api/projects` - List published projects
- `GET /api/projects/[id]` - Get project details
- `POST /api/projects/publish` - Publish project (authenticated)
- `DELETE /api/projects/[id]` - Delete project (authenticated)

### Comments

- `GET /api/comments?projectId=...` - Get project comments
- `POST /api/comments` - Create comment (authenticated)
- `DELETE /api/comments?id=...` - Delete comment (authenticated)

### Likes

- `POST /api/likes` - Toggle like (authenticated)
- `GET /api/likes?projectId=...` - Check if liked (authenticated)

### Follows

- `POST /api/follows` - Toggle follow (authenticated)
- `GET /api/follows?type=followers&userId=...` - Get followers/following

### Reading Progress

- `GET /api/reading-progress?projectId=...` - Get progress (authenticated)
- `POST /api/reading-progress` - Update progress (authenticated)

### Upload

- `POST /api/upload/image` - Upload image to Cloudinary (authenticated)

## 🔐 Authentication

Include JWT token in requests:

```
Authorization: Bearer <your-jwt-token>
```

## 📝 Example API Calls

### Register User

```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1234567890",
    "password": "secure_password",
    "displayName": "John Doe"
  }'
```

### Publish Project

```bash
curl -X POST https://your-app.vercel.app/api/projects/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "novel",
    "title": "My First Novel",
    "description": "An amazing story",
    "genre": "Fiction",
    "authorName": "John Doe",
    "wordCount": 50000,
    "isPublic": true,
    "allowComments": true,
    "items": [
      {
        "itemType": "chapter",
        "name": "Chapter 1",
        "content": "Once upon a time...",
        "orderIndex": 0,
        "depthLevel": 0,
        "wordCount": 1000
      }
    ]
  }'
```

## 🗄️ Database Schema

Main tables:
- `users` - User accounts
- `published_projects` - Published writing projects
- `published_items` - Project content (chapters, sections)
- `comments` - User comments on projects
- `likes` - Project likes
- `follows` - User following relationships
- `reading_history` - User reading progress

## 🔧 NeonDB Setup

1. Create account at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add to environment variables as `DATABASE_URL`

Format: `postgresql://user:password@host/database?sslmode=require`

## ☁️ Cloudinary Setup

1. Create account at https://cloudinary.com
2. Go to Dashboard
3. Copy:
   - Cloud Name
   - API Key
   - API Secret
4. Add to environment variables

## 🐛 Troubleshooting

### Database Connection Issues

- Ensure `DATABASE_URL` includes `?sslmode=require`
- Check NeonDB connection pooling settings
- Verify IP allowlist in NeonDB (Vercel IPs)

### CORS Errors

- Middleware handles CORS automatically
- Check `next.config.js` headers configuration
- Verify origin in request headers

### Image Upload Failures

- Verify Cloudinary credentials
- Check image size limits
- Ensure base64 format is correct

## 📚 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: NeonDB (Serverless PostgreSQL)
- **Storage**: Cloudinary
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Deployment**: Vercel

## 🔒 Security Notes

- Always use HTTPS in production
- Rotate JWT_SECRET regularly
- Enable NeonDB IP allowlist
- Use environment variables for secrets
- Implement rate limiting (recommended)
- Remove/protect `/api/init-db` after setup

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome!

## 📞 Support

For issues, please open a GitHub issue.