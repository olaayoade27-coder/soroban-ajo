use soroban_sdk::{Address, Env, Vec};

use crate::types::Group;

/// Returns `true` if `address` appears in the group's `members` list.
///
/// Performs a linear scan since Soroban's `Vec` does not support O(1) lookup.
/// For groups capped at 100 members this is acceptable.
///
/// # Arguments
/// * `members` - The ordered member list to search
/// * `address` - The address to look for
///
/// # Returns
/// `true` if the address is found in the members list, `false` otherwise
#[inline]
pub fn is_member(members: &Vec<Address>, address: &Address) -> bool {
    members.iter().any(|m| m == *address)
}

/// Returns `true` if every member of the group has contributed in the current cycle.
///
/// Iterates over all members and short-circuits on the first missing contribution.
/// This is called by [`execute_payout`](crate::contract::AjoContract::execute_payout)
/// to gate payout execution — a payout cannot proceed until this returns `true`.
///
/// # Arguments
/// * `env` - The contract environment (needed for storage reads)
/// * `group` - The group whose current cycle contributions are being verified
///
/// # Returns
/// `true` if all members have contributed, `false` otherwise
#[inline]
pub fn all_members_contributed(env: &Env, group: &Group) -> bool {
    let group_id = group.id;
    let cycle = group.current_cycle;
    
    group.members.iter().all(|member| {
        crate::storage::has_contributed(env, group_id, cycle, &member)
    })
}

/// Calculates the total payout amount for a single cycle.
///
/// The payout equals each member's fixed contribution multiplied by the total
/// number of members. This ensures the recipient receives the full pool of contributions.
///
/// # Arguments
/// * `group` - The group whose payout is being calculated
///
/// # Returns
/// Total payout in stroops (`contribution_amount × member_count`)
#[inline]
pub fn calculate_payout_amount(group: &Group) -> i128 {
    let member_count = group.members.len() as i128;
    group.contribution_amount * member_count
}

/// Returns the current ledger timestamp in seconds since Unix epoch.
///
/// Wraps `env.ledger().timestamp()` for testability and to provide a
/// single consistent source of time across the contract.
///
/// # Arguments
/// * `env` - The contract environment used to access the ledger
///
/// # Returns
/// Current Unix timestamp in seconds
#[inline]
pub fn get_current_timestamp(env: &Env) -> u64 {
    env.ledger().timestamp()
}

/// Validates that group creation parameters meet business rules.
///
/// Called at the start of [`create_group`](crate::contract::AjoContract::create_group)
/// before any state is written. All three parameters are validated together
/// so callers receive a specific error identifying which constraint failed.
///
/// # Arguments
/// * `amount` - Proposed contribution amount in stroops; must be > 0
/// * `duration` - Proposed cycle duration in seconds; must be > 0
/// * `max_members` - Proposed member cap; must be between 2 and 100 inclusive
///
/// # Returns
/// `Ok(())` if all parameters are valid
///
/// # Errors
/// * [`ContributionAmountZero`](crate::errors::AjoError::ContributionAmountZero) — if `amount == 0`
/// * [`ContributionAmountNegative`](crate::errors::AjoError::ContributionAmountNegative) — if `amount < 0`
/// * [`CycleDurationZero`](crate::errors::AjoError::CycleDurationZero) — if `duration == 0`
/// * [`MaxMembersBelowMinimum`](crate::errors::AjoError::MaxMembersBelowMinimum) — if `max_members < 2`
/// * [`MaxMembersAboveLimit`](crate::errors::AjoError::MaxMembersAboveLimit) — if `max_members > 100`
pub fn validate_group_params(
    amount: i128,
    duration: u64,
    max_members: u32,
) -> Result<(), crate::errors::AjoError> {
    const MAX_MEMBERS_LIMIT: u32 = 100;

    // Amounts must be positive

    // Amounts must be positive
    if amount == 0 {
        return Err(crate::errors::AjoError::ContributionAmountZero);
    } else if amount < 0 {
        return Err(crate::errors::AjoError::ContributionAmountNegative);
    }

    // Time stops for no one - especially not a zero duration esusu

    // Time stops for no one - especially not a zero duration esusu
    if duration == 0 {
        return Err(crate::errors::AjoError::CycleDurationZero);
    }

    // We need at least two people to rotate money

    // We need at least two people to rotate money
    if max_members < 2 {
        return Err(crate::errors::AjoError::MaxMembersBelowMinimum);
    }

    // Reasonable upper limit to prevent gas issues

    // Reasonable upper limit to prevent gas issues
    if max_members > MAX_MEMBERS_LIMIT {
        return Err(crate::errors::AjoError::MaxMembersAboveLimit);
    }

    Ok(())
}

/// Validates grace period and penalty rate parameters used when creating a group.
///
/// * `grace_period` - must be <= 7 days (604800 seconds)
/// * `penalty_rate` - must be between 0 and 100 inclusive
pub fn validate_penalty_params(
    grace_period: u64,
    penalty_rate: u32,
) -> Result<(), crate::errors::AjoError> {
    const MAX_GRACE: u64 = 604_800; // 7 days
    if grace_period > MAX_GRACE {
        return Err(crate::errors::AjoError::InvalidGracePeriod);
    }
    if penalty_rate > 100 {
        return Err(crate::errors::AjoError::InvalidPenaltyRate);
    }
    Ok(())
}

/// Returns the unix timestamp (seconds) when the current cycle's grace period ends.
/// Calculated as `cycle_start_time + cycle_duration + grace_period`.
pub fn get_grace_period_end(group: &crate::types::Group) -> u64 {
    group.cycle_start_time + group.cycle_duration + group.grace_period
}

/// Returns `true` if the provided `current_time` falls after the cycle end
/// and before or at the grace period end.
pub fn is_within_grace_period(group: &crate::types::Group, current_time: u64) -> bool {
    let cycle_end = group.cycle_start_time + group.cycle_duration;
    let grace_end = get_grace_period_end(group);
    current_time > cycle_end && current_time <= grace_end
}

/// Returns `true` if `address` is the complainant or defendant in the dispute.
pub fn is_dispute_member(dispute: &crate::types::Dispute, address: &Address) -> bool {
    &dispute.complainant == address || &dispute.defendant == address
}
