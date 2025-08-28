import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  http = inject(HttpClient)
  login(s: any): Observable<any> {
    return this.http.post("http://127.0.0.1:8000/login", s);
  }
  signup(s: any): Observable<any> {
    return this.http.post("http://127.0.0.1:8000/signup", s);
  }
}