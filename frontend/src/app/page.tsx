import { redirect } from"next/navigation";

export default function Home() {
 // En un inicio real, validaríamos la sesión.
 // Como estamos en mock, redirigimos al login por defecto (o al dashboard si hubiera sesión).
 redirect("/login");
}
