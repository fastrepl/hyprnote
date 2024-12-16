import Collections
import Foundation

public class AudioQueue<T> {
  private var queue: Deque<T> = Deque<T>()
  private let lock = NSLock()
  private var count: Int = 0

  public init() {}

  public var length: Int {
    lock.lock()
    defer { lock.unlock() }
    return count
  }

  public func clear() {
    lock.lock()
    defer { lock.unlock() }
    queue.removeAll()
    count = 0
  }

  public func push(_ items: any Collection<T>) {
    lock.lock()
    defer { lock.unlock() }

    queue.append(contentsOf: items)
    count += items.count
  }

  public func pop() -> T? {
    lock.lock()
    defer { lock.unlock() }

    let ret = queue.popFirst()
    if ret != nil {
      count -= 1
    }
    return ret
  }
}
