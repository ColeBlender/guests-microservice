import { PostgrestError } from "@supabase/supabase-js";
import supabase from "../db";
import { Metadata } from "@grpc/grpc-js";

export async function generateRoomNumber() {
  let roomNumber = 0;
  let isRoomAvailable = false;

  while (!isRoomAvailable) {
    roomNumber = Math.floor(Math.random() * 1000) + 1;
    const { data, error } = await supabase
      .from("guests")
      .select("room_number")
      .eq("room_number", roomNumber);

    if (error) {
      throw error;
    }

    if (data && data.length === 0) {
      isRoomAvailable = true;
    }
  }

  return roomNumber;
}

export function generateServiceError(error: PostgrestError) {
  return {
    name: "PostgrestError",
    message: error.message,
    code: error.code ? parseInt(error.code) : 13,
    details: error.details || "",
    metadata: new Metadata(),
  };
}
