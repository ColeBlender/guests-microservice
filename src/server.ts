import dotenv from "dotenv";
dotenv.config();

import { Metadata, Server, ServerCredentials } from "@grpc/grpc-js";
import {
  GuestServiceService,
  CheckInGuestRequest,
  CheckInGuestResponse,
  GetGuestRequest,
  Guest,
  IncrementWifiLoginCountRequest,
  IncrementWifiLoginCountResponse,
} from "./generated/guest";
import supabase from "./db";
import { generateRoomNumber, generateServiceError } from "./utils";
import { Callback } from "./utils/types";

const server = new Server();

server.addService(GuestServiceService, {
  async checkInGuest(
    call: { request: CheckInGuestRequest },
    callback: Callback<CheckInGuestResponse>
  ) {
    const { firstName, lastName } = call.request;
    const roomNumber = await generateRoomNumber();

    const { error } = await supabase.from("guests").insert({
      first_name: firstName,
      last_name: lastName,
      room_number: roomNumber,
    });

    if (error) {
      callback(generateServiceError(error), null);
      return;
    }

    const response: CheckInGuestResponse = { roomNumber };
    callback(null, response);
  },

  async getGuestByLastNameAndRoom(
    call: { request: GetGuestRequest },
    callback: Callback<Guest>
  ) {
    const { lastName, roomNumber } = call.request;

    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("last_name", lastName)
      .eq("room_number", roomNumber)
      .single();

    if (error) {
      callback(generateServiceError(error), null);
      return;
    }

    if (!data) {
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
  },

  async incrementWifiLoginCount(
    call: { request: IncrementWifiLoginCountRequest },
    callback: Callback<IncrementWifiLoginCountResponse>
  ) {
    const { lastName, roomNumber } = call.request;

    const { error } = await supabase.rpc("increment_wifi_login_count", {
      last_name_input: lastName,
      room_number_input: roomNumber,
    });

    if (error) {
      callback(generateServiceError(error), null);
      return;
    }

    const response: IncrementWifiLoginCountResponse = { success: true };
    callback(null, response);
  },
});

const port = process.env.PORT || 50051;
server.bindAsync(
  `0.0.0.0:${port}`,
  ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(`Failed to bind server: ${err.message}`);
      return;
    }
    console.log(`Server running at http://0.0.0.0:${port}`);
  }
);
