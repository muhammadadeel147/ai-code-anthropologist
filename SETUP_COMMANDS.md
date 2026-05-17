# 🎯 Quick Setup Commands

## Option 1: Automated Setup (Easiest) ⭐

Run this single command from the project root:

```cmd
QUICK_START.bat
```

**What it does:**
1. ✅ Checks prerequisites (Node.js, Docker)
2. ✅ Creates `.env` file
3. ✅ Creates storage directories
4. ✅ Starts all Docker services
5. ✅ Installs frontend dependencies
6. ✅ Offers to start frontend server

**After the script completes:**
- Edit `.env` and add your IBM Watsonx API key
- Frontend will be at: http://localhost:3000
- Backend API will be at: http://localhost:4000

---

## Option 2: Manual Step-by-Step

### 1️⃣ Setup Environment
```cmd
copy .env.example .env
notepad .env
```
Add your API keys to the `.env` file.

### 2️⃣ Create Storage Directory
```cmd
mkdir storage\repositories
```

### 3️⃣ Start Docker Services
```cmd
docker-compose up -d
```

### 4️⃣ Install Frontend Dependencies
```cmd
cd frontend
npm install
cd ..
```

### 5️⃣ Start Frontend
```cmd
cd frontend
npm run dev
```

---

## Verification Commands

### Check Docker Services
```cmd
docker-compose ps
```

### Test Backend Health
```cmd
curl http://localhost:4000/health
```

### View Logs
```cmd
docker-compose logs -f backend worker
```

---

## Common Operations

### Stop Everything
```cmd
docker-compose down
```

### Restart Services
```cmd
docker-compose restart
```

### Rebuild Containers
```cmd
docker-compose up -d --build
```

### Start Development Mode
```cmd
npm run dev
```

---

## Access Points

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:3000 |
| 🔌 Backend API | http://localhost:4000 |
| 📚 API Docs | http://localhost:4000/api-docs |
| ❤️ Health Check | http://localhost:4000/health |

---

## Troubleshooting

### If ports are in use:
```cmd
# Check what's using the ports
netstat -ano | findstr "3000 4000 5432 6379"

# Kill process by PID (replace <PID> with actual number)
taskkill /PID <PID> /F
```

### If Docker services fail:
```cmd
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

### If frontend won't start:
```cmd
cd frontend
rmdir /s /q node_modules
rmdir /s /q .next
npm install
npm run dev
```

---

**🚀 Ready to go! Start with `QUICK_START.bat`**