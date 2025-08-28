import { Component } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Teams } from "../teams/teams";

@Component({
  selector: 'app-layout',
  imports: [RouterModule, RouterLink],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  username: string | null = 'User';

  constructor(private router: Router) { }

  logout() {
    localStorage.clear(); // clear login data
    this.router.navigate(['/login']);
  }
}
