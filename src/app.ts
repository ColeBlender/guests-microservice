import dotenv from "dotenv";
dotenv.config();

import {
  Metadata,
  Server,
  ServerCredentials,
  credentials,
} from "@grpc/grpc-js";
import {
  GuestServiceService,
  CheckInGuestRequest,
  CheckInGuestResponse,
  GetGuestRequest,
  Guest,
  IncrementWifiLoginCountRequest,
  IncrementWifiLoginCountResponse,
  GuestServiceClient,
} from "./generated/guest";
import supabase from "./db";
import { generateRoomNumber, generateServiceError } from "./utils";
import { Callback } from "./utils/types";
import { connect, StringCodec } from "nats";

const sc = StringCodec();

const server = new Server();

server.addService(GuestServiceService, {
  async checkInGuest(
    call: { request: CheckInGuestRequest },
    callback: Callback<CheckInGuestResponse>
  ) {
    console.log("Check-in request received");
    const { firstName, lastName } = call.request;
    const roomNumber = await generateRoomNumber();

    const { error } = await supabase.from("guests").insert({
      first_name: firstName.toLowerCase(),
      last_name: lastName.toLowerCase(),
      room_number: roomNumber,
    });

    if (error) {
      console.error("Error in check-in process:", error);
      callback(generateServiceError(error), null);
      return;
    }

    const response: CheckInGuestResponse = { roomNumber };
    callback(null, response);
    console.log("Check-in response sent");
  },

  async getGuestByLastNameAndRoom(
    call: { request: GetGuestRequest },
    callback: Callback<Guest>
  ) {
    const { lastName, roomNumber } = call.request;
    console.log("Get guest request received");

    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("last_name", lastName.toLowerCase())
      .eq("room_number", roomNumber)
      .single();

    if (error) {
      console.error("Error in get guest process:", error);
      callback(generateServiceError(error), null);
      return;
    }

    if (!data) {
      console.error("No user found");
      callback(
        {
          name: "NoUserError",
          message: "No user found",
          code: 13,
          details: "No user found",
          metadata: new Metadata(),
        },
        null
      );
      return;
    }

    const guest: Guest = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      roomNumber: data.room_number,
      wifiLoginCount: data.wifi_login_count,
    };

    callback(null, guest);
    console.log("Get guest response sent");
  },

  async incrementWifiLoginCount(
    call: { request: IncrementWifiLoginCountRequest },
    callback: Callback<IncrementWifiLoginCountResponse>
  ) {
    console.log("Increment WiFi login count request received");
    const { lastName, roomNumber } = call.request;

    const { error } = await supabase.rpc("increment_wifi_login_count", {
      last_name_input: lastName.toLowerCase(),
      room_number_input: roomNumber,
    });

    if (error) {
      console.error("Error in increment WiFi login count process:", error);
      callback(generateServiceError(error), null);
      return;
    }

    const response: IncrementWifiLoginCountResponse = { success: true };
    callback(null, response);
    console.log("Increment WiFi login count response sent");
  },
});

async function subscribeToGuestEvents() {
  const nc = await connect({
    servers:
      process.env.NODE_ENV === "development"
        ? "nats://localhost:4222"
        : process.env.NATS_URL,
  });
  console.log("Connected to NATS");

  const sub = nc.subscribe("guest.update");
  console.log('Subscribed to "guest.update" events');

  const client = new GuestServiceClient(
    process.env.NODE_ENV === "development"
      ? "localhost:50051"
      : process.env.GRPC_GUESTS_URL!,
    credentials.createInsecure()
  );

  (async () => {
    for await (const msg of sub) {
      const guestData = JSON.parse(sc.decode(msg.data));
      console.log("Received guest update:", guestData);

      if (guestData.event === "increment.wifi.login.count") {
        const request: IncrementWifiLoginCountRequest = {
          lastName: guestData.data.lastName,
          roomNumber: guestData.data.roomNumber,
        };

        client.incrementWifiLoginCount(request, (error, response) => {
          if (error) {
            console.error("Failed to increment WiFi login count:", error);
          } else {
            console.log("WiFi login count incremented successfully");
          }
        });
      }
    }
  })();

  return nc;
}

server.bindAsync(
  "0.0.0.0:50051",
  ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(`Failed to bind server: ${err.message}`);
      return;
    }
    console.log(`Server running at http://0.0.0.0:${port}`);

    subscribeToGuestEvents().catch((error) => {
      console.error("Failed to subscribe to guest events:", error);
    });
  }
);
