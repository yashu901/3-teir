import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  http = inject(HttpClient);

  login(s: any): Observable<any> {
    return this.http.post("http://16.171.58.156:8000/login", s);
  }

  signup(s: any): Observable<any> {
    return this.http.post("http://16.171.58.156:8000/signup", s);
  }

  setToken(token: string) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
    }
  }
}
