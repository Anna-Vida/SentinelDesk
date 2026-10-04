FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/SentinelDesk.Web/package*.json ./
RUN npm ci
COPY frontend/SentinelDesk.Web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/SentinelDesk.Api/SentinelDesk.Api.csproj backend/SentinelDesk.Api/
RUN dotnet restore backend/SentinelDesk.Api/SentinelDesk.Api.csproj
COPY backend/SentinelDesk.Api/ backend/SentinelDesk.Api/
RUN dotnet publish backend/SentinelDesk.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app ./
COPY --from=frontend /src/frontend/dist ./wwwroot
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "SentinelDesk.Api.dll"]
