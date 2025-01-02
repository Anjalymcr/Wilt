# Dockerfile for the frontend

# Build stage

FROM node:18 AS builder

#Set the working directory
WORKDIR /app

#Copy the package.json and package-lock.json files
COPY package.json package-lock.json ./

#Install dependencies
RUN npm install

#Copy the rest of the application code
COPY . .

#Build the application
RUN npm run build

# Final stage
FROM nginx:stable-alpine

#Copy the build files from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

#Expose port 80
EXPOSE 80

#Start nginx
CMD ["nginx", "-g", "daemon off;"]
