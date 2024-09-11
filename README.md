# Guests Microservice

The **Guests Microservice** is part of the **MGM Grand WiFi Simulation** project and handles guest-related operations using **gRPC**. It interacts with **Supabase** for managing guest data such as room assignments and WiFi login counts.

## Features

- Provides gRPC endpoints for guest check-ins, retrieving guest details, and updating WiFi login counts.
- Uses **Supabase** to store guest information, including names, room numbers, and WiFi login activity.
- Dockerized for deployment.

## gRPC Endpoints

1. **CheckInGuest**: Registers a guest and assigns a room number.
   - **Request**: `first_name`, `last_name`
   - **Response**: `room_number`
2. **GetGuestByLastNameAndRoom**: Retrieves guest details based on last name and room number.
   - **Request**: `last_name`, `room_number`
   - **Response**: `Guest` object
3. **IncrementWifiLoginCount**: Increments the WiFi login count for a guest.
   - **Request**: `last_name`, `room_number`
   - **Response**: `success` (boolean)
