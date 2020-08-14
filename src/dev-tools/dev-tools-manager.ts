import { Subscription } from 'rxjs'
import { countObjectChanges, instanceHandler, isBrowser, objectAssign, objectKeys, parse } from '../helpers'
import { activateDevToolsPushes, isDev } from '../mode'
import { KeyValue, Zone } from '../types'
import { getDefaultDevToolsConfig } from './default-dev-tools-config'
import { DevtoolsOptions } from './dev-tools-options.interface'
import { DevToolsSubjects } from './dev-tools-subjects'
import { StoreStates } from './store-states.enum'

export class DevToolsManager {

  private _userEventsSub = new Subscription()
  private _reduxEventsSub = new Subscription()
  private _appState: KeyValue = {}
  private _loadingStoresCache = {}
  private _zone = {
    run: (f: any) => f()
  }
  private _userEventsDisablerIndex: number | null = null
  private _devTools: any

  constructor(
    private devToolsOptions: Partial<DevtoolsOptions> = {}
  ) { }

  // TODO: Handle late initialization, when one or more stores already exist.
  public initialize(): void {
    if (!isDev() || !isBrowser() || !(window as any).__REDUX_DEVTOOLS_EXTENSION__) return
    (window as any).$$stores = DevToolsSubjects.stores
    const devToolsOptions = this.devToolsOptions
    const mergedOptions = objectAssign(getDefaultDevToolsConfig(), devToolsOptions)
    this.devToolsOptions = mergedOptions
    const reduxDevToolsOptions = {
      name: mergedOptions.name
    }
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect(reduxDevToolsOptions)
    this._devTools = devTools
    this._userEventsSub.unsubscribe()
    this._reduxEventsSub.unsubscribe()
    this._userEventsSub = new Subscription()
    this._reduxEventsSub = new Subscription()
    this._appState = {}
    this._setUserEventsSubscribers(devTools)
    this._setDevToolsEventsSubscribers(devTools)
    activateDevToolsPushes()
  }

  public setDevToolsZone(zone: Zone): void {
    this._zone = zone
  }

  private _setUserEventsSubscribers(devTools: any): void {
    const devToolsOptions = this.devToolsOptions
    const subs = [
      DevToolsSubjects.pausedEvent$.subscribe(storeName => {
        this._appState[storeName] = StoreStates.paused
        devTools.send({ type: `[${storeName}] - PAUSED` }, this._appState)
      }),
      DevToolsSubjects.loadingEvent$.subscribe(storeName => {
        this._appState[storeName] = StoreStates.loading
        devTools.send({ type: `[${storeName}] - Loading...` }, this._appState)
      }),
      DevToolsSubjects.initEvent$.subscribe(store => {
        const isLoading = this._appState[store.name] === StoreStates.loading
        const suffixText = isLoading ? ' (async)' : ''
        this._appState[store.name] = store.state
        devTools.send({ type: `[${store.name}] - @@INIT${suffixText}` }, this._appState)
      }),
      DevToolsSubjects.updateEvent$.subscribe(store => {
        const changes = countObjectChanges(this._appState[store.name], store.state)
        if (!devToolsOptions.logEqualStates && !changes) return
        this._appState[store.name] = store.state
        const updateName = store.updateName ? store.updateName : 'Update Store'
        devTools.send({ type: `[${store.name}] - ${updateName} (${changes} changes)` }, this._appState)
      }),
      DevToolsSubjects.overrideEvent$.subscribe(store => {
        const changes = countObjectChanges(this._appState[store.name], store.state)
        if (!devToolsOptions.logEqualStates && !changes) return
        this._appState[store.name] = store.state
        devTools.send({ type: `[${store.name}] - Override Store (${changes} changes)` }, this._appState)
      }),
      DevToolsSubjects.resetEvent$.subscribe(store => {
        const changes = countObjectChanges(this._appState[store.name], store.state)
        if (!devToolsOptions.logEqualStates && !changes) return
        this._appState[store.name] = store.state
        devTools.send({ type: `[${store.name}] - Reset (${changes} changes)` }, this._appState)
      }),
      DevToolsSubjects.hardResetEvent$.subscribe(storeName => {
        this._appState[storeName] = StoreStates.hardResetting
        devTools.send({ type: `[${storeName}] - Hard-Rest` }, this._appState)
      }),
    ]
    subs.forEach(sub => this._userEventsSub.add(sub))
  }

  private _setDevToolsEventsSubscribers(devTools: any): void {
    this._reduxEventsSub.add(devTools.subscribe((message: any) => {
      if (message.type != 'DISPATCH' || !message.state) return
      const reduxDevToolsState = parse<{}>(message.state)
      objectKeys(reduxDevToolsState).forEach((storeName: string) => {
        const store: any = DevToolsSubjects.stores[storeName]
        if (!store) return
        const reduxDevToolsStoreValue = reduxDevToolsState[storeName]
        const loadingStoresCache = this._loadingStoresCache
        if (reduxDevToolsStoreValue === StoreStates.paused
          || reduxDevToolsStoreValue === StoreStates.loading
          || reduxDevToolsStoreValue === StoreStates.hardResetting
        ) {
          if (loadingStoresCache[storeName]) return
          loadingStoresCache[storeName] = store.value
          this._zone.run(() => {
            this._disableNextUpdate()
            store._isLoading$.next(true)
            store.state = null
          })
        } else {
          this._zone.run(() => {
            this._disableNextUpdate()
            store._setState(() => instanceHandler(store._initialState || loadingStoresCache[storeName], reduxDevToolsStoreValue))
            if (store.isLoading) store._isLoading$.next(false)
          })
          if (loadingStoresCache[storeName]) delete loadingStoresCache[storeName]
        }
      })
    }))
  }

  // BUG: If the store updates itself asynchronously, this solution won't prevent false updating the store.
  // Should try to hook to stat's index instead of timeout.
  private _disableNextUpdate(): void {
    DevToolsSubjects.isLoadingErrorsDisabled = true
    this._userEventsSub.unsubscribe()
    this._userEventsSub = new Subscription()
    clearTimeout(this._userEventsDisablerIndex as number)
    this._userEventsDisablerIndex = setTimeout(() => {
      DevToolsSubjects.isLoadingErrorsDisabled = false
      this._setUserEventsSubscribers(this._devTools)
    })
  }
}
