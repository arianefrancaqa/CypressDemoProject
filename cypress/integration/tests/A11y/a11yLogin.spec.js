describe('A11y', () => {
    it('Check that login page is accessible', () => {
        cy.visit('/');
        cy.injectAxe();
        cy.checkA11y();
    })

    it.only('Check that login page is accessible with Violations Log', () => {
        cy.checkPageA11y('/');
    })
})