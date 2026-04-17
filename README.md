# FaceAttend - Face Recognition Attendance System

A complete face recognition-based attendance tracking system built with Next.js 14, Supabase, and face-api.js. All face recognition runs entirely in the browser.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database + Auth + Storage**: Supabase
- **Face Recognition**: face-api.js (SSD MobileNet + face descriptors, browser-side)
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query
- **Charts**: Recharts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys from Settings > API

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Database Migrations

Using Supabase CLI:
```bash
npx supabase init
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Or manually run the SQL files in `supabase/migrations/` in order via the Supabase SQL Editor.

### 5. Download face-api.js Models

```bash
mkdir -p public/models
cd public/models

# Download SSD MobileNet v1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2

# Download Face Landmark 68
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1

# Download Face Recognition
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2

cd ../..
```

### 6. Create First Admin

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" and create an admin user with email/password
3. Copy the user's UUID
4. Go to SQL Editor and run:
```sql
INSERT INTO admins (id, email, name, role)
VALUES ('your-user-uuid', 'admin@company.com', 'Admin Name', 'superadmin');
```

### 7. Run the App

```bash
npm run dev
```

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/kiosk` | Public | Face recognition attendance kiosk |
| `/admin/login` | Public | Admin login page |
| `/admin/dashboard` | Protected | Attendance dashboard with charts |
| `/admin/employees` | Protected | Employee management + face registration |
| `/admin/attendance` | Protected | Attendance logs with filters |
| `/admin/departments` | Protected | Department management |
| `/admin/reports` | Protected | Monthly attendance reports |
| `/admin/settings` | Protected | System settings + admin management |

## How It Works

1. **Kiosk Mode** (`/kiosk`): Employees face the camera. The system detects their face, extracts a 128-dimensional descriptor, and matches it against stored employee descriptors using Euclidean distance (threshold: 0.5). On match, it records check-in or check-out.

2. **Employee Registration** (`/admin/employees`): Admins capture 3 face images via webcam, average the descriptors, and store the 128-dim vector in PostgreSQL.

3. **All face recognition runs in the browser** - no external API calls, no server-side ML.

## Deployment

Deploy to Vercel:
```bash
npm run build
vercel deploy
```

Ensure all environment variables are set in your Vercel project settings.
