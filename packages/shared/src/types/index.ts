export interface User {
  id: string;
  name: string;
  email: string;
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
