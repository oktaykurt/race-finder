# Race Finder: A Microservice API Gateway Project

This project demonstrates a microservice-based application for finding and managing running races. It utilizes an API Gateway pattern with Nginx to handle request routing, load balancing, fault tolerance, and security for a set of backend Node.js services.

The system is composed of three core microservices:

- **User Auth Service**: Handles user authentication and JWT generation.
- **Race Catalog Service**: Provides public, read-only access to race data with advanced search capabilities.
- **Race Submission Service**: Manages authenticated operations like creating, updating, and deleting races and organizers.

## Key Features

- **Microservice Architecture**: Decoupled services for authentication, race browsing, and race management.
- **API Gateway (Nginx)**: A single, secure entry point for all client requests.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Can manage everything - create/delete organizers and create/update/delete any race.
  - **Organizer**: Can create race and manage only the races they have created.
- **Secure Authentication**: Uses JSON Web Tokens (JWT) for stateless authentication. Passwords are securely hashed using `bcrypt`.
- **SSL/TLS Encryption**: Nginx is configured to terminate SSL, securing all API communication over HTTPS.
- **Load Balancing**: The API Gateway (Nginx) distributes traffic across multiple instances of the `race-catalog` service.
- **Fault Tolerance**: The system remains operational even if one or more instances of a scaled service fail.
- **Advanced Race Search**: Filter races by name, city, country, date range, and distance.

## Architecture Overview

The application follows a classic API Gateway pattern. All incoming traffic is directed to the Nginx gateway, which acts as a reverse proxy.

1.  **Nginx (API Gateway)**: Listens on ports 80 and 443. It redirects all HTTP traffic to HTTPS, terminates SSL, and routes requests to the appropriate backend service based on the URL path and HTTP method. It also load balances requests to scaled services like `race-catalog`.
2.  **User Auth Service**: A dedicated service for the `/auth/login` endpoint. It validates user credentials against the database and issues a JWT upon successful login.
3.  **Race Catalog Service**: Handles all `GET` requests for `/races`. This service is designed to be read-heavy and can be scaled horizontally to handle high traffic loads.
4.  **Race Submission Service**: Handles all write operations (`POST`, `PUT`, `DELETE`) for `/races` and all requests for `/organizers`. It requires a valid JWT for authorization.
5.  **PostgreSQL Database**: A single, shared database that persists all user and race data.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose
- **API Gateway**: Nginx
- **Libraries**: `jsonwebtoken` for JWT, `bcrypt` for password hashing, `pg` for PostgreSQL connection.

---

## Getting Started

### Prerequisites

- Docker
- Docker Compose
- `curl` (for testing the API)
- `jq` (optional, for pretty-printing JSON responses)

### Setup Instructions

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/oktaykurt/race-finder.git
    cd race-finder
    ```

2.  **Generate Self-Signed SSL Certificate**

    The project is configured to use SSL for security. The `nginx-ssl/` directory, which holds the certificate and private key, is listed in `.gitignore` to prevent accidentally committing private keys to the repository. You need to generate these files locally.

    ```bash
    # Create the directory if it doesn't exist
    mkdir -p nginx-ssl

    # Generate a new self-signed certificate and private key
    # This command will prompt you for some information; you can accept the defaults.
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx-ssl/selfsigned.key -out nginx-ssl/selfsigned.crt
    ```

    > **Security Note:** It is crucial to keep your private keys (`.key` files) and other secrets out of public version control. The included `.gitignore` file correctly ignores the `nginx-ssl/` directory for this reason.

3.  **Review Environment Variables**

    Open `docker-compose.yml` and change the `JWT_SECRET` to a new, long, and random string for better security.

    ```yaml
    environment:
      - JWT_SECRET=your_super_secret_and_long_string_here
    ```

4.  **Build and Run the Services**

    Use Docker Compose to build the images and start all the containers.

    ```bash
    docker-compose up --build -d
    ```

    This will start all services, and the database will be initialized with the data from `init.sql`.

---
