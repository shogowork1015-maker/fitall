export type UserRole = 'trainer' | 'trainee'
export type TrainerTraineeStatus = 'pending' | 'active' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  line_user_id: string | null
  created_at: string
}

export interface TrainerProfile {
  id: string
  user_id: string
  bio: string | null
  price_per_session: number
  created_at: string
}

export interface TraineeProfile {
  id: string
  user_id: string
  height: number | null
  weight: number | null
  goal: string | null
  created_at: string
}

export interface TrainerTrainee {
  id: string
  trainer_id: string
  trainee_id: string | null
  status: TrainerTraineeStatus
  invite_token: string
  created_at: string
}

export interface Booking {
  id: string
  trainer_id: string
  trainee_id: string
  scheduled_at: string
  status: BookingStatus
  price: number
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  body_part: string
  created_at: string
}

export interface WorkoutLog {
  id: string
  trainee_id: string
  booking_id: string | null
  logged_at: string
  memo: string | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  log_id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  created_at: string
}

export interface SalesRecord {
  id: string
  trainer_id: string
  booking_id: string
  amount: number
  payment_method: string | null
  paid_at: string
}

export interface Plan {
  id: string
  trainer_id: string
  name: string
  sessions: number
  price: number
  created_at: string
}
