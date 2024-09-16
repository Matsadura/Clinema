# Clinema


## Overview

Clinema is a cinema management application that allows users to manage movie listings, bookings, and user accounts. The application is built using a microservices architecture, with separate services for the API, client, and database. The API is developed using Flask, while the client is built with Vite and Tailwind CSS for a modern user interface. The application uses MySQL as the database to store all relevant data.

## Features
- User authentication and authorization
- Movie listing and details
- Booking management
- Responsive design for mobile and desktop

## Getting Started
To get started with Clinema, clone the repository and follow the instructions in the respective service directories for setup and deployment.

## Tech Stack
Clinema utilizes a modern tech stack to ensure efficient development and a seamless user experience. The key technologies include:

- **client**: A fast build tool and development server for modern web projects, used for the client-side application built with Vite.
- **server**: A Python framework for building web applications, specifically the API developed using Flask.
- **database**: A relational database management system used to store application data, specifically MySQL.



## Technologies Used
- ReactJS
- Vite
- Tailwind CSS
- Flask
- MySQL

## Installation
To install and run Clinema, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Matsadura/movie_name.git
   cd clinema
   ```

2. **Set up the environment**:
   - Ensure you have Docker and Docker Compose installed on your machine.

3. **Build and run the services**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - The API will be available at `http://localhost:5000`
   - The client can be accessed at `http://localhost:5173`

5. **Database setup**:
   - The MySQL database will be automatically set up by Docker. You can connect to it using the credentials defined in the `docker-compose.yml` file.



## Authors

- [Ali JBARI](https://github.com/ila36IX)
- [Badr ANNABI](https://github.com/Badr-Annabi)
- [Karim ASSIHOUT](https://github.com/ashtkarim)
- [Oumaima NAANAA](https://github.com/naanaa59)
- [Radouane ABOUNOUAS](https://github.com/RadouaneAbn)
- [Zidane ZAOUI](https://github.com/matsadura)
