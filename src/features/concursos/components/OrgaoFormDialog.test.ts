import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import OrgaoFormDialog from './OrgaoFormDialog.vue'

describe('cadastro de concurso', () => {
  it('envia os dados preenchidos em português', async () => {
    const onSave = vi.fn()
    render(OrgaoFormDialog, { props: { onSave } })
    await fireEvent.click(screen.getByRole('button', { name: 'Novo concurso' }))
    await fireEvent.update(screen.getByLabelText('Sigla'), 'alece')
    await fireEvent.update(
      screen.getByLabelText('Nome do órgão'),
      'Assembleia Legislativa do Ceará',
    )
    await fireEvent.update(screen.getByLabelText('Município sede'), 'Fortaleza')
    await fireEvent.update(screen.getByLabelText('UF sede'), 'ce')
    await fireEvent.click(screen.getByRole('button', { name: 'Criar concurso' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sigla: 'ALECE', ufSede: 'CE' }))
  })
})
