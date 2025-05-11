import { writable } from 'svelte/store';
import type { ClassroomAvailability, ClassroomReservation, ReservationStore } from '$lib/types';

export const reservationStore = writable<ReservationStore>({
	availability: [],
	reservations: []
});