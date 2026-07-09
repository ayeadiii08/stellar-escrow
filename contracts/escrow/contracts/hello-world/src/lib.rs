#![no_std]

use soroban_sdk::{
    contract,
    contractimpl,
    symbol_short,
    Address,
    Env,
    Symbol,
};


#[contract]
pub struct EscrowContract;


#[contractimpl]
impl EscrowContract {


    // Create Escrow
    pub fn create_escrow(
        env: Env,
        buyer: Address,
        seller: Address,
        amount: i128,
    ) {

        buyer.require_auth();


        env.storage()
            .persistent()
            .set(
                &symbol_short!("BUYER"),
                &buyer
            );


        env.storage()
            .persistent()
            .set(
                &symbol_short!("SELLER"),
                &seller
            );


        env.storage()
            .persistent()
            .set(
                &symbol_short!("AMOUNT"),
                &amount
            );


        env.storage()
            .persistent()
            .set(
                &symbol_short!("STATUS"),
                &symbol_short!("LOCKED")
            );
    }



    // Get Escrow Details
    pub fn get_details(
        env: Env
    ) -> Option<(Address, Address, i128, Symbol)> {


        let buyer: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("BUYER"))?;


        let seller: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("SELLER"))?;


        let amount: i128 = env
            .storage()
            .persistent()
            .get(&symbol_short!("AMOUNT"))?;


        let status: Symbol = env
            .storage()
            .persistent()
            .get(&symbol_short!("STATUS"))?;


        Some(
            (
                buyer,
                seller,
                amount,
                status
            )
        )
    }




    // Release Payment
    pub fn release_payment(
        env: Env
    ) {


        let buyer: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("BUYER"))
            .unwrap();


        buyer.require_auth();



        env.storage()
            .persistent()
            .set(
                &symbol_short!("STATUS"),
                &symbol_short!("RELEASED")
            );
    }




    // Refund
    pub fn refund(
        env: Env
    ) {


        let seller: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("SELLER"))
            .unwrap();


        seller.require_auth();



        env.storage()
            .persistent()
            .set(
                &symbol_short!("STATUS"),
                &symbol_short!("REFUNDED")
            );
    }

}