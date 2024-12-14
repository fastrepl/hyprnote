import Collections
import Foundation

public class AudioQueue<T> {
  private var queue: Deque<T> = Deque<T>()
  private let lock = NSLock()

  public init() {}

  public func push(_ items: Collection<T>) {
    lock.lock()
    defer { lock.unlock() }
    queue.append(contentsOf: items)
  }

  public func pop() -> T? {
    lock.lock()
    defer { lock.unlock() }

    return queue.popFirst()
  }
}
