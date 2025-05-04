import { writable } from 'svelte/store';

import type { ClassroomAvailability} from '$lib/types';

// export interface ClassroomSlot {
// 	start: string;
// 	end: string;
// 	available: boolean;
// }

// export interface ClassroomAvailability {
// 	classroom_id: string;
// 	room_number: string;
// 	capacity: number;
// 	slots: ClassroomSlot[];
// }

export const reservationStore = writable<{
	availability: ClassroomAvailability[];
}>({
	availability: []
});