export type MyReservation = {
	id: number;
	room_id: number;
  room_name: string;
	start_time: string;
	end_time: string;
	actual_end_time: string | null;
};