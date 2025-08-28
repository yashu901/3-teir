import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';

/**
 * Types accepted from backend (defensive)
 */
export interface TeamSummary {
  id?: string;
  _id?: string | { $oid?: string };
  name: string;
  size: number;
  stats?: {
    avgBatting?: number;
    avgBowling?: number;
    avgFielding?: number;
  };
  players?: string[]; // names for list view
}

export interface PlayerFull {
  id?: string;
  _id?: string | { $oid?: string };
  name?: string;
  age?: number;
  batting?: number;
  bowling?: number;
  fielding?: number;
  wicketKeeping?: number;
}

export interface TeamDetail {
  id?: string;
  name?: string;
  size?: number;
  stats?: {
    avgBatting?: number;
    avgBowling?: number;
    avgFielding?: number;
  };
  players?: PlayerFull[];
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './teams.html',
  styleUrl: './teams.css'
})
export class Teams implements OnInit, OnDestroy {
  private API = 'http://127.0.0.1:8000/teams';
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  teams: TeamSummary[] = [];
  filteredTeams: TeamSummary[] = [];
  loading = false;
  error: string | null = null;

  // UI
  showGenerateForm = false;
  generating = false;

  // generate form model
  teamForm = {
    name: '',
    team_size: 11,
    batsmen: 5,
    bowlers: 4,
    keepers: 1,
    allrounders: 1
  };

  // details
  expandedTeamId?: string;
  teamDetail?: TeamDetail;
  detailLoading = false;

  // filters
  searchText = '';

  private navSub: Subscription | null = null;

  constructor() { }

  ngOnInit(): void {
    this.fetchTeams();
    // re-fetch on navigation end to avoid stale data when layout reuses components
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(ev => {
      const nav = ev as NavigationEnd;
      if (nav.urlAfterRedirects.includes('/layout/teams') || nav.url.includes('/layout/teams')) {
        this.fetchTeams();
      }
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.navSub = null;
  }

  // --------------------------------
  // Normalization helpers (single source)
  // --------------------------------
  private extractId(raw: any): string | undefined {
    if (!raw) return undefined;
    // possible shapes:
    // { id: '...' }
    // { _id: '...' }
    // { _id: { $oid: '...' } }
    const candidate = raw.id ?? raw._id ?? (raw._id && (raw._id.$oid ?? raw._id['$oid']));
    if (typeof candidate === 'string') return candidate;
    if (typeof candidate === 'object' && candidate?.$oid) return candidate.$oid;
    return undefined;
  }

  private toTeamSummary(raw: any): TeamSummary {
    return {
      id: this.extractId(raw),
      _id: raw?._id,
      name: raw?.name ?? 'Unnamed Team',
      size: raw?.size ?? raw?.team_size ?? 0,
      stats: raw?.stats ?? { avgBatting: 0, avgBowling: 0, avgFielding: 0 },
      players: Array.isArray(raw?.players) ? raw.players : []
    };
  }

  private toTeamDetail(raw: any): TeamDetail {
    const playersRaw = raw?.players ?? [];
    const players: PlayerFull[] = Array.isArray(playersRaw)
      ? playersRaw.map((p: any) => ({
        id: this.extractId(p),
        _id: p?._id,
        name: p?.name ?? 'Unnamed',
        age: p?.age ?? 0,
        batting: p?.batting ?? 0,
        bowling: p?.bowling ?? 0,
        fielding: p?.fielding ?? 0,
        wicketKeeping: p?.wicketKeeping ?? 0
      }))
      : [];

    return {
      id: this.extractId(raw),
      name: raw?.name,
      size: raw?.size ?? raw?.team_size,
      stats: raw?.stats ?? { avgBatting: 0, avgBowling: 0, avgFielding: 0 },
      players
    };
  }

  // --------------------------------
  // Fetch / CRUD
  // --------------------------------
  fetchTeams() {
    this.loading = true;
    this.error = null;
    this.http.get<any[]>(this.API).subscribe({
      next: data => {
        console.log('[teams] raw list:', data);
        this.teams = (data || []).map(t => this.toTeamSummary(t)).filter(t => !!t.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('[teams] list error', err);
        this.error = 'Failed to load teams';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateTeam() {
    const { team_size, batsmen, bowlers, keepers, allrounders } = this.teamForm as any;
    const sum = (batsmen ?? 0) + (bowlers ?? 0) + (keepers ?? 0) + (allrounders ?? 0);
    if (Number(team_size) !== Number(sum)) {
      alert(`Composition must sum to team_size (${team_size}). Current sum = ${sum}`);
      return;
    }

    this.generating = true;
    this.http.post<any>(`${this.API}/generate`, this.teamForm).subscribe({
      next: raw => {
        console.log('[teams] generate response:', raw);
        const team = this.toTeamSummary(raw);
        if (!team.id) {
          alert('Server returned team without id. Check server response.');
          this.generating = false;
          return;
        }
        this.teams = [team, ...this.teams];
        this.applyFilter();
        this.showGenerateForm = false;
        this.resetForm();
        this.generating = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('[teams] generate error', err);
        const msg = err?.error?.detail ?? err?.message ?? 'Failed to generate team';
        alert(`Failed to generate team: ${msg}`);
        this.generating = false;
      }
    });
  }

  viewTeam(teamId?: string) {
    if (!teamId) return;
    if (this.expandedTeamId === teamId) {
      this.expandedTeamId = undefined;
      this.teamDetail = undefined;
      return;
    }

    this.detailLoading = true;
    this.expandedTeamId = teamId;
    this.http.get<any>(`${this.API}/${teamId}`).subscribe({
      next: raw => {
        console.log('[teams] detail raw:', raw);
        this.teamDetail = this.toTeamDetail(raw);
        this.detailLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('[teams] detail error', err);
        alert('Failed to fetch team details');
        this.detailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteTeam(teamId?: string) {
    if (!teamId) {
      alert('Invalid team id');
      return;
    }
    if (!confirm('Delete team? Players will be unassigned.')) return;

    this.http.delete(`${this.API}/${teamId}`).subscribe({
      next: () => {
        this.teams = this.teams.filter(t => this.extractId(t) !== teamId);
        if (this.expandedTeamId === teamId) {
          this.expandedTeamId = undefined;
          this.teamDetail = undefined;
        }
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('[teams] delete error', err);
        alert('Failed to delete team');
      }
    });
  }

  // --------------------------------
  // UI helpers
  // --------------------------------
  resetForm() {
    this.teamForm = { name: '', team_size: 11, batsmen: 5, bowlers: 4, keepers: 1, allrounders: 1 };
  }

  getId(obj: any): string | undefined {
    return this.extractId(obj);
  }

  applyFilter() {
    const text = (this.searchText || '').trim().toLowerCase();
    if (!text) {
      this.filteredTeams = [...this.teams];
      return;
    }
    this.filteredTeams = this.teams.filter(t => (t.name || '').toLowerCase().includes(text));
  }
}
