import { fireEvent, render, screen } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TimedAlert from './TimedAlert.vue'

describe('TimedAlert', () => {
  afterEach(() => vi.useRealTimers())

  it('pausa o fechamento enquanto o usuário interage', async () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    render(TimedAlert, {
      props: {
        alert: { id: '1', message: 'Concurso adicionado.', duration: 1_000, variant: 'success' },
        onDismiss: dismiss,
      },
    })

    const alert = screen.getByRole('alert')
    await fireEvent.mouseEnter(alert)
    await vi.advanceTimersByTimeAsync(1_500)
    expect(dismiss).not.toHaveBeenCalled()

    await fireEvent.mouseLeave(alert)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(dismiss).toHaveBeenCalledOnce()
  })
})
