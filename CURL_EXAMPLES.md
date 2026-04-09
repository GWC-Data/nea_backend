# Updated API Curl Examples (JWT Authentication - Bearer Token Only)

## Authentication
All endpoints now require JWT Bearer Token (except user registration)
**SECURITY**: User IDs are extracted from the bearer token, not from URL parameters

```bash
# Using JWT token in Authorization header
curl -X GET http://localhost:8080/endpoint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Sample Token Response from Login:
```json
{
  "accessToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFoUkV3a0xyckNNV0hwc0hfVlRsaGxLbDQwREROOWxXb0huYW5vS0RDTEkifQ.eyJ1c2VyIjp7ImlkIjoxLCJuYW1lIjoiQWRtaW4gVXNlciIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4ifSwiaWF0IjoxNzc1NzM4ODcxLCJleHAiOjE3NzU3NDI0NzEsImF1ZCI6Im5lYSIsImlzcyI6Im5lYSJ9.z4ljUgcwfDJBRtpcFmfwIunAaQLlOhO-c4FqY9DSzW4XJH_dkF-KzjgwXs1PWxkjMgqvP7abeM6hoPLOLQtZwQ",
  "tokenExpiry": 1775742471,
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

## AUTH ENDPOINTS

### Login User
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

## USERS ENDPOINTS

### Create User (No Auth Required)
```bash
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user",
    "age": 25,
    "gender": "male"
  }'
```

### Get All Users (JWT Required)
```bash
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Profile (JWT Required - userId from bearer token only)
```bash
curl -X GET http://localhost:8080/users/details \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Security Note**: This endpoint returns only the authenticated user's profile. The userId is extracted from the bearer token - you cannot access other users by modifying URLs.

### Update My Profile (JWT Required - userId from bearer token only)
```bash
curl -X PUT http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "age": 26,
    "gender": "female"
  }'
```

### Delete My Account (JWT Required - userId from bearer token only)
```bash
curl -X DELETE http://localhost:8080/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Profile Details (JWT Required - userId from bearer token)
```bash
curl -X GET http://localhost:8080/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Users Profiles (JWT Required)
```bash
curl -X GET http://localhost:8080/users-profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get User Leaderboard (JWT Required)
```bash
curl -X GET http://localhost:8080/users/leaderboard/top \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## EVENT LOGS ENDPOINTS

### Create Event Log - Check In (JWT Required - userId from bearer token)
```bash
# Without waste image
curl -X POST http://localhost:8080/event-logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventId": 1,
    "groupId": 5,
    "checkInTime": "2026-04-09T10:00:00Z",
    "garbageWeight": 2.5,
    "garbageType": "plastic"
  }'

# With waste image upload
curl -X POST http://localhost:8080/event-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "eventId=1" \
  -F "groupId=5" \
  -F "checkInTime=2026-04-09T10:00:00Z" \
  -F "garbageWeight=2.5" \
  -F "garbageType=plastic" \
  -F "wasteImage=@/path/to/image.jpg"
```

### Get All Event Logs (JWT Required)
```bash
curl -X GET http://localhost:8080/event-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Event Log By ID (JWT Required)
```bash
curl -X GET http://localhost:8080/event-logs/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Event Log - Check Out (JWT Required)
```bash
# Without new waste image
curl -X PUT http://localhost:8080/event-logs/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "checkOutTime": "2026-04-09T12:00:00Z",
    "garbageWeight": 3.0,
    "garbageType": "metal"
  }'

# With new waste image
curl -X PUT http://localhost:8080/event-logs/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "checkOutTime=2026-04-09T12:00:00Z" \
  -F "garbageWeight=3.0" \
  -F "garbageType=metal" \
  -F "wasteImage=@/path/to/new-image.jpg"
```

### Delete Event Log (JWT Required)
```bash
curl -X DELETE http://localhost:8080/event-logs/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Event Logs (JWT Required - userId from bearer token)
```bash
curl -X GET http://localhost:8080/event-logs/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Event Logs by Event (JWT Required)
```bash
curl -X GET http://localhost:8080/event-logs/event/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Event Logs by Date (JWT Required - userId from bearer token)
```bash
curl -X GET http://localhost:8080/event-logs/user/date/2026-04-09 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Event Logs by Date Range (JWT Required)
```bash
curl -X POST http://localhost:8080/event-logs/date-range \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "startDate": "2026-04-01",
    "endDate": "2026-04-30"
  }'
```

### Get My Rewards Summary (JWT Required - userId from bearer token)
```bash
curl -X GET http://localhost:8080/event-logs/user/rewards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## EVENTS ENDPOINTS

### Create Event (JWT Required)
```bash
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "date": "2026-05-15",
    "location": "Central Park",
    "name": "Beach Cleanup",
    "details": "Clean up the beach",
    "description": "A community effort to clean the beach",
    "rewards": "Free t-shirt"
  }'
```

### Get All Events (JWT Required)
```bash
curl -X GET http://localhost:8080/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Event By ID (JWT Required)
```bash
curl -X GET http://localhost:8080/events/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Event (JWT Required)
```bash
curl -X PUT http://localhost:8080/events/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Beach Cleanup",
    "location": "New Beach",
    "rewards": "Free t-shirt and cap"
  }'
```

### Delete Event (JWT Required)
```bash
curl -X DELETE http://localhost:8080/events/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Events by Date (JWT Required)
```bash
curl -X GET http://localhost:8080/events/date/2026-05-15 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Upcoming Events (JWT Required)
```bash
curl -X GET http://localhost:8080/events/upcoming \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Popular Events (JWT Required)
```bash
curl -X GET http://localhost:8080/events/popular \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Join Event (JWT Required - userId from bearer token)
```bash
curl -X POST http://localhost:8080/events/1/join \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Leave Event (JWT Required - userId from bearer token)
```bash
curl -X POST http://localhost:8080/events/1/leave \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Event Participants (JWT Required)
```bash
curl -X GET http://localhost:8080/events/1/participants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Joined Events (JWT Required - userId from bearer token)
```bash
curl -X GET http://localhost:8080/events/joined \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Event Profile (No Auth Required - Public)
```bash
curl -X GET http://localhost:8080/events/1/profile
```

### Get All Events Profiles (No Auth Required - Public)
```bash
curl -X GET http://localhost:8080/events-profiles
```

---

## GROUPS ENDPOINTS

### Create Group (JWT Required)
```bash
curl -X POST http://localhost:8080/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "groupName": "Green Warriors"
  }'
```

### Get All Groups (JWT Required)
```bash
curl -X GET http://localhost:8080/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Group By ID (JWT Required)
```bash
curl -X GET http://localhost:8080/groups/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Group (JWT Required)
```bash
curl -X PUT http://localhost:8080/groups/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "groupName": "Green Warriors United"
  }'
```

### Delete Group (JWT Required)
```bash
curl -X DELETE http://localhost:8080/groups/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Group Users (JWT Required)
```bash
curl -X GET http://localhost:8080/groups/1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## SECURITY CHANGES SUMMARY

### ✅ Bearer Token Only - NO URL Parameters for User IDs
All endpoints now extract user information directly from the JWT bearer token:
- **Endpoint**: `/users/details` (NO URL ID param)
- **Security**: User can only access their own data via the bearer token
- **Cannot bypass**: Users cannot access other profiles by changing the URL

### ✅ Removed ALL userId Parameters from URLs
- No more `/users/:userId` → Now: `/users/details` (uses token)
- No more `/event-logs/user/:userId` → Now: `/event-logs/user` (uses token)
- No more `/events/:userId/joined` → Now: `/events/joined` (uses token)

### ✅ JWT Token Structure
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "iat": 1775738871,
  "exp": 1775742471
}
```

The `user.id` is extracted and used for all operations - frontend cannot modify this.

### ✅ No userId in Request Bodies
All endpoints no longer accept `userId` in the request body - it's always from the token.
