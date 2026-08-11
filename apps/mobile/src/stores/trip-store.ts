import { create } from 'zustand';
import { tripRepo } from '../repositories/trip-repository';
import { budgetRepo } from '../repositories/budget-repository';
import type { trips, expenses } from '../db/schema';
import { syncTripNotifications } from '../services/notification-service';
import { syncAllWidgets } from '../services/widget-service';

type Trip = typeof trips.$inferSelect;
type Expense = typeof expenses.$inferSelect;

interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  expenses: Expense[];
  isLoading: boolean;
  
  loadTrips: () => Promise<void>;
  setActiveTrip: (tripId: string | null) => Promise<void>;
  createTrip: (data: Omit<typeof trips.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTrip: (tripId: string, data: Partial<Omit<typeof trips.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  addExpense: (data: Omit<typeof expenses.$inferInsert, 'id'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Omit<typeof expenses.$inferInsert, 'id' | 'tripId'>>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  removeTrip: (tripId: string) => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  activeTrip: null,
  expenses: [],
  isLoading: false,

  loadTrips: async () => {
    set({ isLoading: true });
    try {
      const allTrips = await tripRepo.getTrips();
      set({ trips: allTrips });
      
      // Auto-set or auto-unset active trip based on date
      const { activeTrip } = get();
      const today = new Date();
      today.setHours(0,0,0,0);
      
      let shouldAutoSet = false;
      if (!activeTrip) {
        shouldAutoSet = true;
      } else if (activeTrip.endDate) {
        const endDate = new Date(activeTrip.endDate);
        endDate.setHours(0,0,0,0);
        if (endDate < today) {
          shouldAutoSet = true;
          set({ activeTrip: null, expenses: [] });
        }
      }

      if (shouldAutoSet && allTrips.length > 0) {
        const upcoming = allTrips
          .filter(t => !t.endDate || new Date(t.endDate) >= today)
          .sort((a, b) => {
            if (!a.startDate && !b.startDate) return 0;
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          });
          
        if (upcoming.length > 0) {
          await get().setActiveTrip(upcoming[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveTrip: async (tripId) => {
    if (!tripId) {
      set({ activeTrip: null, expenses: [] });
      syncTripNotifications(null);
      syncAllWidgets(null, []);
      return;
    }
    
    set({ isLoading: true });
    try {
      const trip = await tripRepo.getTripById(tripId);
      if (trip) {
        const tripExpenses = await budgetRepo.getExpensesForTrip(tripId);
        set({ activeTrip: trip, expenses: tripExpenses });
        syncTripNotifications(trip);
        syncAllWidgets(trip, tripExpenses);
      }
    } catch (error) {
      console.error('Failed to set active trip:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createTrip: async (data) => {
    try {
      const newTrips = await tripRepo.createTrip(data);
      if (newTrips && newTrips.length > 0) {
        set((state) => ({ trips: [...state.trips, newTrips[0]] }));
        await get().setActiveTrip(newTrips[0].id);
      }
    } catch (error) {
      console.error('Failed to create trip:', error);
    }
  },

  addExpense: async (data) => {
    try {
      const newExpenses = await budgetRepo.addExpense(data);
      if (newExpenses && newExpenses.length > 0) {
        set((state) => {
          const updated = [...state.expenses, newExpenses[0]];
          syncAllWidgets(state.activeTrip, updated);
          return { expenses: updated };
        });
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  },

  updateTrip: async (tripId, data) => {
    try {
      const updatedTrips = await tripRepo.updateTrip(tripId, data);
      if (updatedTrips && updatedTrips.length > 0) {
        set((state) => {
          const newTrips = state.trips.map(t => t.id === tripId ? updatedTrips[0] : t);
          const newActive = state.activeTrip?.id === tripId ? updatedTrips[0] : state.activeTrip;
          syncTripNotifications(newActive);
          syncAllWidgets(newActive, state.expenses);
          return {
            trips: newTrips,
            activeTrip: newActive,
          };
        });
      }
    } catch (error) {
      console.error('Failed to update trip:', error);
    }
  },

  updateExpense: async (id, data) => {
    try {
      const updatedExpenses = await budgetRepo.updateExpense(id, data);
      if (updatedExpenses && updatedExpenses.length > 0) {
        set((state) => {
          const updated = state.expenses.map(e => e.id === id ? updatedExpenses[0] : e);
          syncAllWidgets(state.activeTrip, updated);
          return { expenses: updated };
        });
      }
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  },

  removeExpense: async (id) => {
    try {
      await budgetRepo.deleteExpense(id);
      set((state) => {
        const updated = state.expenses.filter(e => e.id !== id);
        syncAllWidgets(state.activeTrip, updated);
        return { expenses: updated };
      });
    } catch (error) {
      console.error('Failed to remove expense:', error);
    }
  },

  removeTrip: async (tripId) => {
    try {
      await tripRepo.deleteTrip(tripId);
      const { trips, activeTrip } = get();
      const remainingTrips = trips.filter(t => t.id !== tripId);
      
      set({ trips: remainingTrips });
      
      if (activeTrip?.id === tripId) {
        if (remainingTrips.length > 0) {
          const today = new Date();
          today.setHours(0,0,0,0);
          
          const upcoming = remainingTrips
            .filter(t => !t.endDate || new Date(t.endDate) >= today)
            .sort((a, b) => {
              if (!a.startDate && !b.startDate) return 0;
              if (!a.startDate) return 1;
              if (!b.startDate) return -1;
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            });
            
          if (upcoming.length > 0) {
            await get().setActiveTrip(upcoming[0].id);
          } else {
            set({ activeTrip: null, expenses: [] });
          }
        } else {
          set({ activeTrip: null, expenses: [] });
        }
      }
    } catch (error) {
      console.error('Failed to remove trip:', error);
    }
  },
}));
