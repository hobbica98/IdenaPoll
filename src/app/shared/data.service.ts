import {Injectable} from '@angular/core';
import {SessionBean} from '../shared/model/session.bean';
import {PollBean} from './model/poll.bean';
import {Store} from '@ngrx/store';
import {Router} from '@angular/router';
import {getSession, State} from '@app-redux/index';
import {HttpClient} from '@angular/common/http';
import {setActivePolls, setAuth, setRecentPolls, setSelectedPoll, setSession, setToken} from '@app-redux/core.actions';
import {openDialogBar} from '@app-shared/open-status-bar.functions';

@Injectable({
  providedIn: 'root'
})
/**
 * Class responsible for the API Calls to retrieve data from the Backend
 */
export class DataService {
  private SERVER_URL = 'https://json.idenapoll.com';
  private IDENA_URL = 'https://api.idena.io/api';
  private EXPRESS_URL = 'https://express.idenapoll.com';
  private session: SessionBean = null;
  private auth: string = '';

  constructor(private httpClient: HttpClient, protected store: Store<State>, protected router: Router) {
    this.store.select(getSession).subscribe(value => {
      this.session = value;
    });
  }

  getIdentityData(id: string) {
    let age;
    let address;
    let status;
    let CALL_URL = this.IDENA_URL + '/Identity/' + id;
    this.httpClient.get<any>(CALL_URL).subscribe((p) => {
      const json = p['result'];
      address = json['address'];
      status = json['state'].toUpperCase();
    });
    CALL_URL += '/age';
    this.httpClient.get<any>(CALL_URL).subscribe((p) => {
      age = p['result'];
      this.store.dispatch(setSession({value: new SessionBean(parseInt(age), address, status)}));
    });
  }

  getSessionOnlyCheck() {
    const CALL_URL = this.EXPRESS_URL + '/auth/v1/session?onlyCheck=true';
    let address;
    this.httpClient.get<any>(CALL_URL, {withCredentials: true}).subscribe((p) => {
      address = p['address'];
      this.getIdentityData(address);
    });


  }

  getSession(): any {
    const CALL_URL = this.EXPRESS_URL + '/auth/v1/session';
    this.httpClient.get<any>(CALL_URL, {withCredentials: true}).subscribe((p) => {
      this.store.dispatch(setAuth({value: p}));
    }, (err) => {
      console.log(err);
      this.auth += '1';
      this.store.dispatch(setAuth({value: this.auth}));
    });
  }

  getAuthToken(): void {
    let token: string = '';
    const CALL_URL = this.EXPRESS_URL + '/auth/v1/new-token';
    this.httpClient.get<JSON>(CALL_URL, {
      withCredentials: true,
      responseType: 'json',
      headers: {
        'Accept': 'application/json; charset=utf-8',
      }
    }).subscribe((p) => {
      token = p['token'];
      this.store.dispatch(setToken({value: token}));
    });
  }

  getPollById(id: string) {
    let poll: PollBean;
    const CALL_URL = this.SERVER_URL + '/polls/' + id;
    this.httpClient.get<any>(CALL_URL).subscribe((p) => {
      poll = new PollBean(p);
      this.store.dispatch(setSelectedPoll({value: poll}));
    });
  }

  getRecentPolls() {
    let polls: PollBean[] = [];
    const CALL_URL = this.SERVER_URL + '/polls?_sort=createdAt&_order=desc&_limit=10&status=active';
    this.httpClient.get<any>(CALL_URL).subscribe((p) => {
      for (let j of p) {
        polls.push(new PollBean(j));
      }
      this.store.dispatch(setRecentPolls({value: polls}));
    });
  }

  getActivePolls() {
    let polls: PollBean[] = [];
    const CALL_URL = this.SERVER_URL + '/polls?status=active';
    this.httpClient.get<any>(CALL_URL).subscribe((p) => {
      for (let j of p) {
        polls.push(new PollBean(j));
      }
      this.store.dispatch(setActivePolls({value: polls}));
    });
  }

  votePoll(pollId: string, optionValue: number) {
    const CALL_URL = this.EXPRESS_URL + '/vote';
    let body = JSON.stringify({'poll': pollId, 'option': optionValue});
    this.httpClient.post<any>(CALL_URL, body, {responseType: 'json', withCredentials: true}).subscribe((p) => {
      if (p['status'] === 'ok') {
        openDialogBar(this.store, 'info', 'Vote Submitted correctly');
      } else if (p['status'] === 'dup') {
        openDialogBar(this.store, 'error', 'You already voted on this poll!');
      } else {
        openDialogBar(this.store, 'error', 'Generic Error');
      }
    });
  }

  createPoll(poll: PollBean) {
    const CALL_URL = this.EXPRESS_URL + '/create';
    this.httpClient.post<any>(CALL_URL, JSON.stringify(poll), {
      responseType: 'json',
      withCredentials: true
    }).subscribe((p) => {
      openDialogBar(this.store, 'info', 'Poll created correctly');
      this.router.navigateByUrl(`/poll/${p['id']}`);
    });
  }


}
