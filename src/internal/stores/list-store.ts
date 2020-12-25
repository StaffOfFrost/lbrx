import { isArray, isNumber, isString, isUndefined, throwError } from '../helpers'
import { BaseStore } from './base-store'
import { ListStoreConfigCompleteInfo, ListStoreConfigOptions } from './config'
import { SetStateParam, State } from './store-accessories'


export class ListStore<T extends object, E = any> extends BaseStore<T[], T, E> {

  //#region state

  /** @internal */
  protected readonly _idItemMap: Map<string | number, T> = new Map()

  /** @internal */
  protected readonly _itemIndexMap: WeakMap<T, number> = new WeakMap()

  /** @internal */
  protected set _state(value: State<T[], E>) {
    if (value.value && !this._idItemMap.size) {
      if (!this._idItemMap.size) this._setIdItemMap(value.value)
      this._setItemIndexMap(value.value)
    }
    super._state = value
  }
  protected get _state(): State<T[], E> {
    return super._state
  }

  //#region state
  //#endregion config

  protected readonly _config!: ListStoreConfigCompleteInfo<T>

  /**
   * @get Returns store's configuration.
   */
  public get config(): ListStoreConfigCompleteInfo<T> {
    return this._config
  }

  /** @internal */
  protected readonly _idKey: keyof T | null

  //#endregion config
  //#region constructor

  /**
   * Synchronous initialization.
   */
  constructor(initialValue: T[], storeConfig?: ListStoreConfigOptions<T>)
  /**
   * Asynchronous or delayed initialization.
   * The store will be set into loading state till initialization.
   */
  constructor(initialValue: null, storeConfig?: ListStoreConfigOptions<T>)
  /**
   * Dynamic initialization.
   */
  constructor(initialValue: T[] | null, storeConfig?: ListStoreConfigOptions<T>)
  constructor(initialValueOrNull: T[] | null, storeConfig?: ListStoreConfigOptions<T>) {
    super(storeConfig)
    const config = this._config
    this._idKey = config.idKey = config.idKey || null
    this._preInit(initialValueOrNull)
  }

  //#endregion constructor
  //#region helper-methods

  /** @internal */
  protected _assertValidId(value: any): value is string | number {
    if (this._idItemMap.has(value)) {
      throwError(`Store: "${this._config.name}" has been provided with duplicate id keys. Duplicate key: ${value}.`)
    } else if (!isString(value) && !isNumber(value)) {
      throwError(`Store: "${this._config.name}" has been provided with key that is not a string and nor a number.`)
    }
    return true
  }

  //#endregion helper-methods
  //#region state-methods

  /** @internal */
  protected _setState({
    valueFnOrState,
    actionName,
    stateExtension,
    doSkipClone,
    doSkipFreeze,
  }: SetStateParam<T[], E>): void {
    super._setState({
      valueFnOrState,
      actionName,
      stateExtension,
      doSkipClone: isUndefined(doSkipClone) ? false : doSkipClone,
      doSkipFreeze: isUndefined(doSkipFreeze) ? false : doSkipFreeze,
    })
  }

  /** @internal */
  protected _setIdItemMap(value: T[] | Readonly<T[]> | T | Readonly<T>): void {
    const idKey = this._idKey
    if (!idKey) return
    const setPredicate = (x: T) => {
      const y = x[idKey]
      if (this._assertValidId(y)) this._idItemMap.set(y, x)
    }
    if (isArray(value)) value.forEach(setPredicate)
    else setPredicate(value as T)
  }

  protected _setItemIndexMap(value: T[] | Readonly<T[]> | T | Readonly<T>, index?: number): void {
    if (isArray(value)) value.forEach((x, i) => this._itemIndexMap.set(x, i))
    else if (isNumber(index)) this._itemIndexMap.set(value as T, index)
  }

  //#endregion state-methods
}
