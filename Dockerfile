FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/SentinelDesk.Web/package*.json ./
RUN npm install
COPY frontend/SentinelDesk.Web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/SentinelDesk.Api/SentinelDesk.Api.csproj backend/SentinelDesk.Api/
RUN dotnet restore backend/SentinelDesk.Api/SentinelDesk.Api.csproj
COPY backend/SentinelDesk.Api/ backend/SentinelDesk.Api/
WORKDIR /src/backend/SentinelDesk.Api
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=backend /app/publish ./
COPY --from=frontend /src/frontend/dist ./wwwroot
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SentinelDesk.Api.dll"]
