import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';

export interface Player {
  id?: string;
  _id?: string | { $oid?: string };
  name: string;
  age: number;
  batting: number;
  bowling: number;
  fielding: number;
  wicketKeeping: number;
}

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './players.html',
  styleUrl: './players.css'
})
export class Players implements OnInit, OnDestroy {
  players: Player[] = [];
  filteredPlayers: Player[] = [];
  pagedPlayers: Player[] = [];

  loading = true;
  error: string | null = null;
  cdr = inject(ChangeDetectorRef);

  showAddForm = false;
  newPlayer: Partial<Player> = this.getEmptyPlayer();

  editingPlayer: Player | null = null;

  // filters
  searchName: string = '';
  minAge: number | null = null;
  maxAge: number | null = null;

  skillFilters = {
    batting50: false,
    bowling50: false,
    fielding50: false,
    wicketKeeping50: false
  };

  // sorting
  sortField: keyof Player | '' = '';
  sortAsc: boolean = true;

  // pagination
  currentPage: number = 1;
  pageSize: number = 20;

  private API_URL = "http://127.0.0.1:8000/players";
  private router = inject(Router);
  private http = inject(HttpClient);
  private navSub: Subscription | null = null;
  Math = Math;

  ngOnInit(): void {
    this.fetchPlayers();
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((ev) => {
        const nav = ev as NavigationEnd;
        if (nav.urlAfterRedirects.includes('/layout/players') || nav.url.includes('/layout/players')) {
          this.fetchPlayers();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.navSub) {
      this.navSub.unsubscribe();
      this.navSub = null;
    }
  }

  private normalize(raw: any): Player {
    const maybeId = raw.id ?? raw._id ?? (raw._id && (raw._id.$oid ?? raw._id['$oid']));
    const id = typeof maybeId === 'string' ? maybeId : (maybeId && typeof maybeId === 'object' ? maybeId.$oid : undefined);

    return {
      id,
      _id: raw._id,
      name: raw.name,
      age: raw.age,
      batting: raw.batting,
      bowling: raw.bowling,
      fielding: raw.fielding,
      wicketKeeping: raw.wicketKeeping
    } as Player;
  }

  fetchPlayers() {
    this.loading = true;
    this.http.get<any[]>(this.API_URL).subscribe({
      next: (data) => {
        this.players = (data || []).map(p => this.normalize(p));
        this.players = this.players.filter(p => !!p.id);
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[players] fetch error', err);
        this.error = "Failed to load players.";
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  addPlayer() {
    if (!this.newPlayer.name || !this.newPlayer.age) {
      alert("Please fill required fields.");
      return;
    }
    this.http.post<any>(this.API_URL, this.newPlayer).subscribe({
      next: (raw) => {
        const player = this.normalize(raw);
        if (!player.id) {
          alert('Backend returned player without id');
          return;
        }
        this.players = [...this.players, player];
        this.applyFilters();
        this.resetForm();
        this.showAddForm = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[players] add error', err);
        alert("Failed to add player. See console.");
      }
    });
  }

  startEdit(player: Player) {
    this.editingPlayer = { ...player }; // copy
  }

  cancelEdit() {
    this.editingPlayer = null;
  }

  updatePlayer() {
    if (!this.editingPlayer) return;

    const id = this.getId(this.editingPlayer);
    if (!id) {
      alert("Invalid player ID");
      return;
    }

    this.http.put<any>(`${this.API_URL}/${id}`, this.editingPlayer).subscribe({
      next: (raw) => {
        const updated = this.normalize(raw);
        this.players = this.players.map(p => this.getId(p) === id ? updated : p);
        this.applyFilters();
        this.editingPlayer = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[players] update error', err);
        alert("Failed to update player. See console.");
      }
    });
  }

  getId(player: Player): string | undefined {
    if (player.id) return player.id;
    if (typeof player._id === 'string') return player._id;
    if (player._id && typeof player._id === 'object') return (player._id as { $oid?: string }).$oid;
    return undefined;
  }

  deletePlayer(id: string | undefined) {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this player?')) return;

    this.http.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        this.players = this.players.filter(p => this.getId(p) !== id);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[players] delete error', err);
        alert('Failed to delete player. See console.');
      }
    });
  }

  resetForm() {
    this.newPlayer = this.getEmptyPlayer();
  }

  getEmptyPlayer(): Partial<Player> {
    return {
      name: '',
      age: undefined,
      batting: undefined,
      bowling: undefined,
      fielding: undefined,
      wicketKeeping: undefined
    };
  }

  applyFilters() {
    let list = this.players.filter(p => {
      const matchesName = this.searchName ? p.name.toLowerCase().includes(this.searchName.toLowerCase()) : true;
      const matchesMinAge = this.minAge !== null ? p.age >= this.minAge : true;
      const matchesMaxAge = this.maxAge !== null ? p.age <= this.maxAge : true;

      const matchesBatting = this.skillFilters.batting50 ? p.batting >= 50 : true;
      const matchesBowling = this.skillFilters.bowling50 ? p.bowling >= 50 : true;
      const matchesFielding = this.skillFilters.fielding50 ? p.fielding >= 50 : true;
      const matchesWK = this.skillFilters.wicketKeeping50 ? p.wicketKeeping >= 50 : true;

      return matchesName && matchesMinAge && matchesMaxAge &&
        matchesBatting && matchesBowling && matchesFielding && matchesWK;
    });

    if (this.sortField) {
      list = list.sort((a, b) => {
        const field = this.sortField as keyof Player;
        const valA = a[field] as string | number;
        const valB = b[field] as string | number;

        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    this.filteredPlayers = list;
    this.setPage(1);
  }

  setPage(page: number) {
    const totalPages = Math.ceil(this.filteredPlayers.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedPlayers = this.filteredPlayers.slice(start, end);
  }

  nextPage() {
    this.setPage(this.currentPage + 1);
  }

  prevPage() {
    this.setPage(this.currentPage - 1);
  }
}
