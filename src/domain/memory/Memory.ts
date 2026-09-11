
export type MemoryCategory = | "IDENTITY" | "RELATIONSHIP" | "PERSON" |"PREFERENCE" | "FACT"

export interface Memory {
    id:string,
    category:MemoryCategory,
    key:string,
    value:string,
    createdAt:string,
    updatedAt:string,
}