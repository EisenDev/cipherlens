# CipherLens API Reference (API.md)

This document details the HTTP REST API endpoints, request schemas, validation criteria, and response structures for **CipherLens** Authentication.

---

## 1. Global Specifications

*   **Base URL:** `http://localhost:3000` (development)
*   **Default Headers**:
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <access_token>` (for protected routes)
*   **Interactive Documentation (Swagger):** Mapped to `/api` (e.g., `http://localhost:3000/api`)

---

## 2. API Endpoints

### 2.1 User Signup
Registers a new developer or team account.

*   **Endpoint:** `POST /api/auth/signup`
*   **Authentication:** None
*   **Request Body**:
    ```json
    {
      "fullName": "John Doe",
      "email": "john.doe@company.com",
      "password": "securePassword123",
      "confirmPassword": "securePassword123",
      "companyName": "Acme Corp",
      "teamSize": "5-10",
      "role": "Developer"
    }
    ```
*   **Validation Rules (Zod)**:
    *   `fullName`: Required, non-empty.
    *   `email`: Required, valid email format.
    *   `password`: Required, minimum 8 characters.
    *   `confirmPassword`: Required, must match `password`.
    *   `companyName`, `teamSize`, `role`: Optional, string or null.
*   **Success Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "message": "Account created successfully."
    }
    ```
*   **Error Response (`409 Conflict`)**:
    ```json
    {
      "success": false,
      "message": "An account with this email already exists."
    }
    ```

---

### 2.2 User Login
Authenticates credentials and returns access & refresh tokens.

*   **Endpoint:** `POST /api/auth/login`
*   **Authentication:** None
*   **Request Body**:
    ```json
    {
      "email": "john.doe@company.com",
      "password": "securePassword123"
    }
    ```
*   **Success Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "5f3a76b9-e1cf-4d9f-a2e6-df0cf6a3b2b4",
        "fullName": "John Doe",
        "email": "john.doe@company.com"
      }
    }
    ```
*   **Error Response (`401 Unauthorized`)**:
    ```json
    {
      "success": false,
      "message": "Invalid credentials."
    }
    ```

---

### 2.3 Current User Profile
Retrieves the profile data of the logged-in user.

*   **Endpoint:** `GET /api/auth/me`
*   **Authentication:** Bearer Access Token
*   **Headers**:
    ```http
    Authorization: Bearer <access_token>
    ```
*   **Success Response (`200 OK`)**:
    ```json
    {
      "id": "5f3a76b9-e1cf-4d9f-a2e6-df0cf6a3b2b4",
      "fullName": "John Doe",
      "email": "john.doe@company.com",
      "companyName": "Acme Corp",
      "teamSize": "5-10",
      "role": "Developer",
      "isActive": true
    }
    ```
*   **Error Response (`401 Unauthorized`)**:
    ```json
    {
      "success": false,
      "message": "Invalid or expired access token."
    }
    ```

---

### 2.4 Token Refresh (Rotation)
Rotates refresh tokens and issues a new access token.

*   **Endpoint:** `POST /api/auth/refresh`
*   **Authentication:** None (requires refresh token in body)
*   **Request Body**:
    ```json
    {
      "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```
*   **Success Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```
*   **Error Response (`401 Unauthorized`)**:
    ```json
    {
      "success": false,
      "message": "Invalid refresh token."
    }
    ```

---

### 2.5 User Logout
Revokes the refresh token, terminating the active session.

*   **Endpoint:** `POST /api/auth/logout`
*   **Authentication:** None
*   **Request Body**:
    ```json
    {
      "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```
*   **Success Response (`200 OK`)**:
    ```json
    {
      "success": true
    }
    ```

---

## 3. Global Error Handling Format

### 3.1 Validation Error Structure (Zod)
Validation failures (e.g. 400 Bad Request) return a structured array of fields and custom messages:
```json
{
  "success": false,
  "errors": [
    {
      "field": "confirmPassword",
      "message": "Passwords must match."
    }
  ]
}
```

### 3.2 Standard API Error Structure
Other failures (e.g., 401 Unauthorized, 404 Not Found, 500 Internal Error) return a standard error string:
```json
{
  "success": false,
  "message": "Invalid credentials."
}
```
Stack traces are blocked automatically at the global filter level to safeguard environment configurations.
