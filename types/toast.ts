export type ToastVariant = "default" | "success" | "error";

export interface ToastMessage {
  id: string;
  text: string;
  variant: ToastVariant;
}
