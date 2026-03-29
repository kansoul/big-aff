<?php

namespace App\Models\Traits\Method;

use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

/**
 * Trait BitwiseMethod
 */
trait BitwiseMethod
{
    /**
     * Get the bitwise fields defined for this model
     */
    protected function getBitwiseFields(): array
    {
        return property_exists($this, 'bitwiseFields') ? $this->bitwiseFields : [];
    }

    /**
     * Validate if a field is configured for bitwise operations
     */
    protected function validateBitwiseField(string $field): void
    {
        if (! in_array($field, $this->getBitwiseFields())) {
            throw new InvalidArgumentException(
                "Field '{$field}' is not configured as a bitwise field for ".static::class
            );
        }
    }

    /**
     * Check if a specific bit is set in a field
     */
    public function hasBit(string $field, int $bit): bool
    {
        $this->validateBitwiseField($field);

        $fieldValue = $this->getAttribute($field) ?? 0;

        return ($fieldValue & $bit) === $bit;
    }

    /**
     * Check if any of the specified bits are set in a field
     */
    public function hasAnyBit(string $field, array $bits): bool
    {
        foreach ($bits as $bit) {
            if ($this->hasBit($field, $bit)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if all of the specified bits are set in a field
     */
    public function hasAllBits(string $field, array $bits): bool
    {
        foreach ($bits as $bit) {
            if (! $this->hasBit($field, $bit)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Set a specific bit in a field
     *
     *
     * @return $this
     */
    public function setBit(string $field, int $bit): self
    {
        $this->validateBitwiseField($field);

        $fieldValue = $this->getAttribute($field) ?? 0;

        $this->setAttribute($field, $fieldValue | $bit);

        return $this;
    }

    /**
     * Set multiple bits in a field
     *
     *
     * @return $this
     */
    public function setBits(string $field, array $bits): self
    {
        foreach ($bits as $bit) {
            $this->setBit($field, $bit);
        }

        return $this;
    }

    /**
     * Unset (clear) a specific bit in a field
     *
     *
     * @return $this
     */
    public function unsetBit(string $field, int $bit): self
    {
        $this->validateBitwiseField($field);

        $fieldValue = $this->getAttribute($field) ?? 0;

        $this->setAttribute($field, $fieldValue & ~$bit);

        return $this;
    }

    /**
     * Unset (clear) multiple bits in a field
     *
     *
     * @return $this
     */
    public function unsetBits(string $field, array $bits): self
    {
        foreach ($bits as $bit) {
            $this->unsetBit($field, $bit);
        }

        return $this;
    }

    /**
     * Clear all bits in a field (set to 0)
     *
     *
     * @return $this
     */
    public function clearAllBits(string $field): self
    {
        $this->validateBitwiseField($field);
        $this->setAttribute($field, 0);

        return $this;
    }

    /**
     * Convert bit position to bit value
     */
    public function positionToValue(int $position): int
    {
        return 1 << $position;
    }

    /**
     * Check if a specific bit position is set in a field
     */
    public function hasBitAtPosition(string $field, int $position): bool
    {
        return $this->hasBit($field, $this->positionToValue($position));
    }

    /**
     * Set a specific bit at position in a field
     *
     *
     * @return $this
     */
    public function setBitAtPosition(string $field, int $position): self
    {
        return $this->setBit($field, $this->positionToValue($position));
    }

    /**
     * Set multiple bits at positions in a field
     *
     *
     * @return $this
     */
    public function setBitAtPositions(string $field, array $positions): self
    {
        foreach ($positions as $position) {
            $this->setBitAtPosition($field, $position);
        }

        return $this;
    }

    /**
     * Unset a specific bit at position in a field
     *
     *
     * @return $this
     */
    public function unsetBitAtPosition(string $field, int $position): self
    {
        return $this->unsetBit($field, $this->positionToValue($position));
    }

    /**
     * Get an array of set bit positions in a field
     */
    public function getSetBitPositions(string $field, int $maxBits = 32): array
    {
        $this->validateBitwiseField($field);

        $fieldValue = $this->getAttribute($field) ?? 0;
        $setBits = [];

        for ($i = 0; $i < $maxBits; $i++) {
            if (($fieldValue & (1 << $i)) !== 0) {
                $setBits[] = $i;
            }
        }

        return $setBits;
    }

    /**
     * Get an array of bit values that make up a field value
     */
    public function getBitValues(string $field): array
    {
        $this->validateBitwiseField($field);

        $fieldValue = $this->getAttribute($field) ?? 0;

        return $this->decomposeBitValue($fieldValue);
    }

    /**
     * Decompose an integer into its constituent bit values
     */
    public function decomposeBitValue(int $value): array
    {
        $bitValues = [];
        $position = 0;

        while ($value > 0) {
            $bitValue = 1 << $position;
            if (($value & $bitValue) === $bitValue) {
                $bitValues[] = $bitValue;
                $value &= ~$bitValue;
            }
            $position++;
        }

        return $bitValues;
    }

    /**
     * Create a scope to filter models by bit value
     *
     *
     * @return Builder
     *
     * @SuppressWarnings(PHPMD.BooleanArgumentFlag)
     */
    public function scopeWhereBit(
        Builder $query,
        string $field,
        int $bit,
        bool $shouldHave = true
    ) {
        if ($shouldHave) {
            return $query->whereRaw("({$field} & ?) = ?", [$bit, $bit]);
        }

        return $query->whereRaw("({$field} & ?) = 0", [$bit]);
    }

    /**
     * Create a scope to filter models by any of the specified bits
     *
     *
     * @return Builder
     */
    public function scopeWhereAnyBit(
        Builder $query,
        string $field,
        array $bits
    ) {
        $totalValue = 0;
        foreach ($bits as $bit) {
            $totalValue |= $bit;
        }

        return $query->whereRaw("({$field} & ?) > 0", [$totalValue]);
    }

    /**
     * Create a scope to filter models by all of the specified bits
     *
     *
     * @return Builder
     */
    public function scopeWhereAllBits(
        Builder $query,
        string $field,
        array $bits
    ) {
        $totalValue = 0;
        foreach ($bits as $bit) {
            $totalValue |= $bit;
        }

        return $query->whereRaw("({$field} & ?) = ?", [$totalValue, $totalValue]);
    }
}
