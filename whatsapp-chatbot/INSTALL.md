# 🐧 Guía de Instalación por Distribución

Esta guía te ayudará a instalar y configurar el WhatsApp Chatbot en diferentes distribuciones de Linux.

## 📋 Sistemas Soportados

- ✅ **Manjaro/Arch Linux** (desarrollo)
- ✅ **Debian 11+ / Ubuntu 20.04+** (producción)

---

## 🏠 Manjaro/Arch Linux (Desarrollo)

### Pre-requisitos
```bash
# Actualizar sistema
sudo pacman -Syu

# Instalar herramientas básicas si no las tienes
sudo pacman -S curl wget git base-devel
```

### Instalación Automática
```bash
# Clonar el proyecto
git clone <tu-repo> drasBot
cd drasBot/whatsapp-chatbot

# Ejecutar instalación automática
./scripts/install-deps.sh

# Configuración completa del sistema
./scripts/manage.sh setup
```

### Instalación Manual (Opcional)
Si prefieres instalar manualmente:

```bash
# Node.js y npm
sudo pacman -S nodejs npm

# Go
sudo pacman -S go

# PM2
npm install -g pm2

# Herramientas adicionales
sudo pacman -S tmux htop
```

### Configuración de Desarrollo
```bash
# Copiar configuración de ejemplo
cp .env.example .env

# Editar para desarrollo
nano .env
```

En `.env`, configura para desarrollo:
```bash
NODE_ENV=development
LOG_LEVEL=debug
POLLING_INTERVAL=1000
DEBUG_MODE=true
```

---

## 🏢 Debian 11 "Bullseye" (Producción)

### Pre-requisitos
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y curl wget git build-essential
```

### Instalación Automática
```bash
# Clonar el proyecto
git clone <tu-repo> drasBot
cd drasBot/whatsapp-chatbot

# Ejecutar instalación automática
./scripts/install-deps.sh

# Configuración completa del sistema (incluye firewall)
./scripts/manage.sh setup
```

### Instalación Manual (Opcional)

#### Node.js (Versión LTS recomendada)
```bash
# Instalar NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

# Instalar Node.js
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

#### Go (Versión reciente)
```bash
# Descargar Go 1.21.5
wget https://golang.org/dl/go1.21.5.linux-amd64.tar.gz

# Instalar
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# Añadir al PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verificar
go version
```

#### PM2 y otras herramientas
```bash
# PM2
npm install -g pm2

# Herramientas del sistema
sudo apt install -y tmux htop ufw

# Verificar PM2
pm2 --version
```

### Configuración de Producción
```bash
# Copiar configuración de ejemplo
cp .env.example .env

# Editar para producción
nano .env
```

En `.env`, mantén la configuración de producción:
```bash
NODE_ENV=production
LOG_LEVEL=info
POLLING_INTERVAL=2000
DEBUG_MODE=false
HOST=127.0.0.1
```

---

## 🔒 Configuración de Seguridad (Solo Debian/Producción)

### Configuración Automática
```bash
# Configurar firewall y seguridad
./scripts/manage.sh security
```

### Configuración Manual del Firewall
```bash
# Instalar y configurar UFW
sudo apt install -y ufw

# Configurar reglas
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw deny 3000/tcp comment 'Block Chatbot'
sudo ufw deny 8080/tcp comment 'Block Bridge'
sudo ufw allow in on lo
sudo ufw --force enable

# Verificar estado
sudo ufw status verbose
```

---

## 🚀 Inicio del Sistema

### Para Ambas Distribuciones

#### Inicio Completo
```bash
# Iniciar todos los servicios
./scripts/manage.sh start

# Ver estado
./scripts/manage.sh status

# Ver logs
./scripts/manage.sh logs
```

#### Inicio por Componentes
```bash
# Solo el bridge
./scripts/manage.sh bridge-start

# Solo el chatbot
./scripts/manage.sh chatbot-start
```

### Gestión con Tmux (Recomendado para Desarrollo)
```bash
# Iniciar bridge en tmux
cd ../whatsapp-bridge
tmux new-session -d -s whatsapp-bridge "go run main.go"

# Ver sesión
tmux attach -t whatsapp-bridge

# Salir sin cerrar: Ctrl+B, luego D
```

---

## 🔧 Diferencias Entre Entornos

### Manjaro (Desarrollo)
- ✅ Actualizaciones automáticas con `pacman`
- ✅ Logs de debug activados
- ✅ Polling más rápido para desarrollo
- ✅ Sin firewall restrictivo (desarrollo local)
- ✅ tmux recomendado para gestión manual

### Debian (Producción)
- ✅ Paquetes estables con `apt`
- ✅ Firewall UFW configurado
- ✅ Logs optimizados para producción
- ✅ PM2 para gestión automática de procesos
- ✅ Configuración de seguridad estricta

---

## 🐛 Resolución de Problemas Específicos

### Manjaro/Arch
```bash
# Si falla la instalación de npm packages
sudo chown -R $USER:$USER ~/.npm

# Si Go no se encuentra después de pacman
sudo pacman -S go
which go

# Actualizar todo el sistema
sudo pacman -Syu
```

### Debian
```bash
# Si Node.js está desactualizado
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Si Go no está en PATH después de instalación manual
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Si hay problemas con permisos de PM2
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## 📊 Verificación de Instalación

Ejecuta este comando para verificar que todo esté correcto:

```bash
# Verificar todas las dependencias
./scripts/manage.sh status

# Monitor completo de seguridad
./scripts/manage.sh monitor

# Test de conectividad
curl -s http://127.0.0.1:3000/status || echo "Chatbot no está corriendo"
```

---

## 🔗 Enlaces Útiles

- **Node.js**: https://nodejs.org/
- **Go**: https://golang.org/
- **PM2**: https://pm2.keymetrics.io/
- **UFW**: https://help.ubuntu.com/community/UFW
- **Tmux**: https://github.com/tmux/tmux

---

**💡 Consejo**: En desarrollo (Manjaro) usa tmux para gestión manual. En producción (Debian) usa PM2 con los scripts automatizados.
