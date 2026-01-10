// API Services index
export { default as salesApi } from './sales'
export { default as commandCenterApi } from './command-center'
export { default as distributorsApi } from './distributors'
export { default as productionApi } from './production'
export { default as marketingApi } from './marketing'
export { default as settingsApi } from './settings'
export { default as adminApi } from './admin'
export { default as notepadApi } from './notepad'

// Re-export types
export type {
  UserSettings,
  UserProfile,
  Department,
  UpdateProfileData,
  UpdateSettingsData
} from './settings'

export type {
  User,
  UserDetail,
  UsersResponse,
  Role,
  CreateUserData,
  UpdateUserData
} from './admin'
