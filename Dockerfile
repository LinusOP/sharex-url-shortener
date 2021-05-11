FROM node:latest

ENV NODE_ENV=production
WORKDIR /app

# Install packages
COPY ["package.json", "package-lock.json", "./"]
RUN npm install --production

# Copy and run the rest of the app
COPY . .
CMD ["node", "index.js"]
