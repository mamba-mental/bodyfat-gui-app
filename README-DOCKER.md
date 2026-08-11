# Body Fat Tracker - Docker Deployment

> **Legacy Docker README.** It is not the current run command: Windows supervises Next.js `:3010` and FastAPI `:8313`; optional Redis alone runs in WSL/Docker on `:6385`. See [`RUNBOOK.md`](RUNBOOK.md).

## 🎯 MVP Ready for NAS Deployment

This application is **100% complete** with all 23 features implemented:
- ✨ Enhanced nutrition widgets with macronutrient breakdowns
- 🎨 Modern theme selector with visual previews
- 📱 Redesigned setup page
- 🔔 Clear settings explanations
- 📊 Full dashboard and reporting functionality
- 🤖 AI-powered insights and calculations

## 🐳 Docker Deployment

### Quick Start
```bash
# Build and run
docker-compose up -d

# Access at http://your-nas-ip:3000
```

### For NAS with Reverse Proxy

1. **Copy project to NAS**
2. **Update docker-compose.yml** with your domain
3. **Run:**
   ```bash
   docker-compose up -d
   ```

### Manual Docker Build
```bash
# Build image
docker build -t bodyfat-tracker .

# Run container
docker run -d \
  --name bodyfat-tracker \
  -p 3000:3000 \
  --restart unless-stopped \
  bodyfat-tracker
```

## 🔧 Reverse Proxy Configuration

### Traefik (included in docker-compose.yml)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.bodyfat.rule=Host(`bodyfat.yourdomain.com`)"
  - "traefik.http.routers.bodyfat.tls=true"
```

### Nginx Proxy Manager
- **Domain:** bodyfat.yourdomain.com
- **Forward to:** container-ip:3000
- **Block Common Exploits:** Yes
- **SSL:** Let's Encrypt

### Caddy
```
bodyfat.yourdomain.com {
    reverse_proxy bodyfat-tracker:3000
}
```

## 📊 Features Overview

### Core Functionality
- PRIME calculation engine with AI confidence scoring
- Weekly progression tracking and predictions
- Comprehensive progress reports (HTML/Markdown export)
- Custom workout program support (Bodybuilding, PowerLifting, CrossFit, Cardio)

### Enhanced Features
- Macronutrient breakdown based on diet type (Keto, High Protein, Balanced)
- Personalized nutrition tips based on workout type
- Modern theme selector (Light/Dark/System)
- Responsive design with gradient UI
- Local data storage (privacy-focused)

### Technical Features
- TypeScript for type safety
- Next.js 15 with Turbopack
- Recharts for data visualization
- Tailwind CSS for styling
- Local storage for data persistence

## 🚀 Production Ready

- ✅ All development tasks completed
- ✅ TypeScript compilation clean
- ✅ Production build optimized
- ✅ Docker containerized
- ✅ Health checks included
- ✅ Reverse proxy ready

## 📝 MVP Status: COMPLETE

This application is ready for production deployment on your NAS with reverse proxy integration.
